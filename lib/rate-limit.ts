type RateLimitKey = string;

export type RateLimitOptions = {
  windowMs: number;
  max: number;
};

export type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
};

type RateLimitEntry = {
  count: number;
  resetTime: number;
};

const store = new Map<RateLimitKey, RateLimitEntry>();

const DEFAULT_WINDOW_MS = 60_000;
const DEFAULT_MAX = 60;
const CLEANUP_INTERVAL_MS = 5 * 60_000;

let lastCleanup = 0;

function now() {
  return Date.now();
}

function cleanupExpiredEntries(currentTime: number) {
  if (currentTime - lastCleanup < CLEANUP_INTERVAL_MS) {
    return;
  }

  for (const [key, entry] of store.entries()) {
    if (entry.resetTime <= currentTime) {
      store.delete(key);
    }
  }

  lastCleanup = currentTime;
}

export function createRateLimiter(defaultOptions?: Partial<RateLimitOptions>) {
  const resolvedDefaults: RateLimitOptions = {
    windowMs: defaultOptions?.windowMs ?? DEFAULT_WINDOW_MS,
    max: defaultOptions?.max ?? DEFAULT_MAX,
  };

  return {
    check(key: string, overrideOptions?: Partial<RateLimitOptions>): RateLimitResult {
      const currentTime = now();

      cleanupExpiredEntries(currentTime);

      const options: RateLimitOptions = {
        windowMs: overrideOptions?.windowMs ?? resolvedDefaults.windowMs,
        max: overrideOptions?.max ?? resolvedDefaults.max,
      };

      const existing = store.get(key);

      if (!existing || existing.resetTime <= currentTime) {
        const resetTime = currentTime + options.windowMs;
        store.set(key, {
          count: 1,
          resetTime,
        });

        return {
          success: true,
          limit: options.max,
          remaining: Math.max(options.max - 1, 0),
          reset: resetTime,
        };
      }

      existing.count += 1;
      store.set(key, existing);

      const success = existing.count <= options.max;
      const remaining = Math.max(options.max - existing.count, 0);

      return {
        success,
        limit: options.max,
        remaining,
        reset: existing.resetTime,
      };
    },
  };
}

export const rateLimiter = createRateLimiter();

export function getClientIdentifier(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0]?.trim();
    if (firstIp) {
      return firstIp;
    }
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  return "anonymous";
}

export function buildRateLimitKey(prefix: string, request: Request, suffix?: string): string {
  const identifier = getClientIdentifier(request);
  return [prefix, identifier, suffix].filter(Boolean).join(":");
}

export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const resetSeconds = Math.max(Math.ceil((result.reset - now()) / 1000), 0);

  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.floor(result.reset / 1000)),
    "Retry-After": String(resetSeconds),
  };
}
// Higher-order function wrapper for rate-limited routes
export function withRateLimit(handler: (req: Request, ...args: any[]) => Promise<Response>, prefix?: string) {
  return async function (request: Request, ...args: any[]) {
    const key = buildRateLimitKey(prefix || 'api', request);
    const result = await rateLimiter.check(key);
    if (!result.success) {
      return new Response(JSON.stringify({ error: 'Too many requests' }), {
        status: 429,
        headers: { ...getRateLimitHeaders(result), 'Content-Type': 'application/json' },
      });
    }
    return handler(request, ...args);
  };
}

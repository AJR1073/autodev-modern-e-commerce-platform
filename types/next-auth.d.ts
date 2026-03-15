import { DefaultSession } from 'next-auth';
import { JWT as DefaultJWT } from 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: DefaultSession['user'] & {
      id: string;
      role: 'CUSTOMER' | 'ADMIN';
      email: string;
      name?: string | null;
    };
  }

  interface User {
    id: string;
    role: 'CUSTOMER' | 'ADMIN';
    email: string;
    name?: string | null;
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    id?: string;
    role?: 'CUSTOMER' | 'ADMIN';
    email?: string;
    name?: string | null;
  }
}
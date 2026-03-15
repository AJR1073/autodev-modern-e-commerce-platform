import { z } from 'zod';

const emailSchema = z
  .string()
  .trim()
  .min(1, 'Email is required.')
  .email('Please enter a valid email address.')
  .max(255, 'Email must be 255 characters or fewer.')
  .transform((value) => value.toLowerCase());

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters long.')
  .max(128, 'Password must be 128 characters or fewer.')
  .regex(/[a-z]/, 'Password must include at least one lowercase letter.')
  .regex(/[A-Z]/, 'Password must include at least one uppercase letter.')
  .regex(/[0-9]/, 'Password must include at least one number.');

const optionalStrongPasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters long.')
  .max(128, 'Password must be 128 characters or fewer.')
  .regex(/[a-z]/, 'Password must include at least one lowercase letter.')
  .regex(/[A-Z]/, 'Password must include at least one uppercase letter.')
  .regex(/[0-9]/, 'Password must include at least one number.')
  .optional();

const nameSchema = z
  .string()
  .trim()
  .min(2, 'Name must be at least 2 characters long.')
  .max(100, 'Name must be 100 characters or fewer.');

const roleSchema = z.enum(['CUSTOMER', 'ADMIN']).default('CUSTOMER');

export const loginSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(1, 'Password is required.')
    .max(128, 'Password must be 128 characters or fewer.'),
});

export const registerSchema = z
  .object({
    name: nameSchema,
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z
      .string()
      .min(1, 'Please confirm your password.')
      .max(128, 'Confirm password must be 128 characters or fewer.'),
    role: roleSchema.optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

export const updateProfileSchema = z.object({
  name: nameSchema.optional(),
  email: emailSchema.optional(),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, 'Current password is required.')
      .max(128, 'Current password must be 128 characters or fewer.'),
    newPassword: passwordSchema,
    confirmNewPassword: z
      .string()
      .min(1, 'Please confirm your new password.')
      .max(128, 'Confirm password must be 128 characters or fewer.'),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: 'New passwords do not match.',
    path: ['confirmNewPassword'],
  });

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z
  .object({
    token: z
      .string()
      .trim()
      .min(1, 'Reset token is required.')
      .max(512, 'Reset token is invalid.'),
    password: passwordSchema,
    confirmPassword: z
      .string()
      .min(1, 'Please confirm your password.')
      .max(128, 'Confirm password must be 128 characters or fewer.'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

export const authSessionSchema = z.object({
  userId: z.string().trim().min(1, 'User ID is required.'),
  email: emailSchema,
  role: roleSchema,
});

export const adminCreateUserSchema = z
  .object({
    name: nameSchema,
    email: emailSchema,
    password: passwordSchema,
    role: roleSchema,
  });

export const adminUpdateUserSchema = z.object({
  name: nameSchema.optional(),
  email: emailSchema.optional(),
  password: optionalStrongPasswordSchema,
  role: roleSchema.optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type AuthSessionInput = z.infer<typeof authSessionSchema>;
export type AdminCreateUserInput = z.infer<typeof adminCreateUserSchema>;
export type AdminUpdateUserInput = z.infer<typeof adminUpdateUserSchema>;
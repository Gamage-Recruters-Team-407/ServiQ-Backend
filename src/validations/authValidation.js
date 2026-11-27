const { z } = require("zod");
const { USER_ROLES, PROVIDER_TYPES } = require("../constants/enums");

const SELF_REGISTER_ROLES = [USER_ROLES.CUSTOMER, USER_ROLES.PROVIDER];

const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[\d\s\-()]{7,18}$/, "Enter a valid phone number");

const registerSchema = z.object({
  first_name: z
    .string({ required_error: "First name is required" })
    .trim()
    .min(1, "First name is required")
    .max(60, "First name cannot exceed 60 characters"),
  last_name: z
    .string({ required_error: "Last name is required" })
    .trim()
    .min(1, "Last name is required")
    .max(60, "Last name cannot exceed 60 characters"),
  email: z
    .string({ required_error: "Email address is required" })
    .trim()
    .toLowerCase()
    .email("Enter a valid email address"),
  phone_number: phoneSchema.optional().or(z.literal("")),
  password: z
    .string({ required_error: "Password is required" })
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password cannot exceed 128 characters"),
  user_role: z
    .enum(SELF_REGISTER_ROLES, {
      errorMap: () => ({
        message: "Registration role must be Customer or Service Provider"
      })
    })
    .optional()
    .default(USER_ROLES.CUSTOMER),
  provider_type: z
    .enum(Object.values(PROVIDER_TYPES))
    .optional()
    .default(PROVIDER_TYPES.INDIVIDUAL)
});

const loginSchema = z
  .object({
    identifier: z.string().trim().optional(),
    email: z.string().trim().toLowerCase().optional(),
    phone_number: z.string().trim().optional(),
    password: z
      .string({ required_error: "Password is required" })
      .min(1, "Password is required"),
    remember_me: z.boolean().optional().default(false)
  })
  .refine(
    (data) => Boolean(data.identifier || data.email || data.phone_number),
    {
      message: "Email or phone number is required",
      path: ["identifier"]
    }
  );

const forgotPasswordSchema = z
  .object({
    identifier: z.string().trim().optional(),
    email: z.string().trim().toLowerCase().optional(),
    phone_number: z.string().trim().optional()
  })
  .refine(
    (data) => Boolean(data.identifier || data.email || data.phone_number),
    {
      message: "Registered email or phone number is required",
      path: ["identifier"]
    }
  );

const verifyOtpSchema = z
  .object({
    identifier: z.string().trim().optional(),
    email: z.string().trim().toLowerCase().optional(),
    phone_number: z.string().trim().optional(),
    otp: z
      .string({ required_error: "Verification code is required" })
      .trim()
      .regex(/^\d{6}$/, "Verification code must be 6 digits")
  })
  .refine(
    (data) => Boolean(data.identifier || data.email || data.phone_number),
    {
      message: "Registered email or phone number is required",
      path: ["identifier"]
    }
  );

const resetPasswordSchema = z
  .object({
    identifier: z.string().trim().optional(),
    email: z.string().trim().toLowerCase().optional(),
    phone_number: z.string().trim().optional(),
    otp: z
      .string({ required_error: "Verification code is required" })
      .trim()
      .regex(/^\d{6}$/, "Verification code must be 6 digits"),
    new_password: z
      .string({ required_error: "New password is required" })
      .min(8, "New password must be at least 8 characters")
      .max(128, "Password cannot exceed 128 characters")
  })
  .refine(
    (data) => Boolean(data.identifier || data.email || data.phone_number),
    {
      message: "Registered email or phone number is required",
      path: ["identifier"]
    }
  );

module.exports = {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  verifyOtpSchema,
  resetPasswordSchema
};

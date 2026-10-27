const { z } = require("zod");
const { USER_ROLES } = require("../constants/enums");

const registerSchema = z.object({
  first_name: z
    .string({ required_error: "First name is required" })
    .trim()
    .min(2, "First name must be at least 2 characters"),
  last_name: z
    .string({ required_error: "Last name is required" })
    .trim()
    .min(2, "Last name must be at least 2 characters"),
  email: z
    .string({ required_error: "Email is required" })
    .trim()
    .toLowerCase()
    .email("Invalid email format"),
  phone_number: z
    .string()
    .trim()
    .optional()
    .or(z.literal("")),
  password: z
    .string({ required_error: "Password is required" })
    .min(6, "Password must be at least 6 characters"),
  user_role: z
    .enum([USER_ROLES.CUSTOMER, USER_ROLES.PROVIDER], {
      errorMap: () => ({ message: "Role must be Customer or Service Provider" })
    })
    .default(USER_ROLES.CUSTOMER)
});

const loginSchema = z.object({
  email: z
    .string({ required_error: "Email or phone number is required" })
    .trim(),
  password: z
    .string({ required_error: "Password is required" })
    .min(1, "Password cannot be empty")
});

module.exports = {
  registerSchema,
  loginSchema
};

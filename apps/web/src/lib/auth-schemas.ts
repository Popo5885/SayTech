import { z } from "zod";

const englishPasswordMessage =
  "Password must be 8+ characters and contain English letters or numbers only.";

export const englishPasswordSchema = z
  .string()
  .min(8, englishPasswordMessage)
  .regex(/^[a-zA-Z0-9]+$/, englishPasswordMessage);

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: englishPasswordSchema
});

export const registerSchema = z.object({
  fullName: z.string().trim().min(1),
  email: z.string().trim().toLowerCase().email(),
  password: englishPasswordSchema,
  phone: z.string().trim().min(1),
  accepted: z.literal(true)
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;

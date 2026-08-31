import { z } from "zod";

export const createParticipantRegistrySchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio"),
});

export const createUserSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio"),
  email: z.string().trim().email("Email inválido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
  role: z.enum(["manager", "leader", "participant"]).optional(),
});

export type CreateParticipantRegistryInput = z.infer<
  typeof createParticipantRegistrySchema
>;
export type CreateUserInput = z.infer<typeof createUserSchema>;

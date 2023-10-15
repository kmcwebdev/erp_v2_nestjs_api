import { z } from 'zod';

// TODO: Add description to zod types
export const NewUserEmailSchema = z.object({
  to: z.array(z.string().email()),
  email: z.string().email(),
  fullName: z.string().min(1),
  password: z.string().min(1),
});

export type NewUserEmailType = z.infer<typeof NewUserEmailSchema>;

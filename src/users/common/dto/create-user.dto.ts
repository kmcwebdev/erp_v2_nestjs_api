import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

const CreateUserSchema = z.object({
  email: z
    .string({
      description: 'The email of the user',
      required_error: 'Email is required',
      invalid_type_error: 'Email must be a string',
    })
    .email({
      message: 'Email must be a valid email',
    }),
  // TODO: Add description here as well.
  propelauth_user_id: z.string().uuid(),
});

export type CreateUserType = z.infer<typeof CreateUserSchema>;

export class CreateUserDTO extends createZodDto(CreateUserSchema) {}

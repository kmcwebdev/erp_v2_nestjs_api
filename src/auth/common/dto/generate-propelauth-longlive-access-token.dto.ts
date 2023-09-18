import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

const GeneratePropelauthLongliveAccessTokenSchema = z.object({
  user_id: z
    .string({
      description: 'The propelauth user id',
      required_error: 'User id is required',
      invalid_type_error: 'User id must be a string',
    })
    .uuid({
      message: 'User id must be a valid uuid',
    }),
});

export type GeneratePropelauthLongliveAccessTokenType = z.infer<
  typeof GeneratePropelauthLongliveAccessTokenSchema
>;

export class GeneratePropelauthLongliveAccessTokenDTO extends createZodDto(
  GeneratePropelauthLongliveAccessTokenSchema,
) {}

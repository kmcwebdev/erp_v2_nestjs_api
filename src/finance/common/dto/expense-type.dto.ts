import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

const ExpenseTypeSchema = z.object({
  request_type_id: z
    .string({
      description: 'The request type id of the expense type',
      required_error: 'Request type id is required',
      invalid_type_error: 'Request type id must be a string',
    })
    .uuid({
      message: 'Request type id must be a valid uuid',
    }),
});

export class ExpenseTypeDto extends createZodDto(ExpenseTypeSchema) {}

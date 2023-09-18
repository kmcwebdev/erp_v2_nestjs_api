import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

const GetOneReimbursementRequestSchema = z.object({
  reimbursement_request_id: z
    .string({
      description: 'reimbursement_type_id',
      invalid_type_error: 'reimbursement_type_id must be a string',
    })
    .uuid({
      message: 'reimbursement_type_id must be a valid uuid',
    }),
});

export type GetOneReimbursementRequestType = z.infer<
  typeof GetOneReimbursementRequestSchema
>;

export class GetOneReimbursementRequestDTO extends createZodDto(
  GetOneReimbursementRequestSchema,
) {}

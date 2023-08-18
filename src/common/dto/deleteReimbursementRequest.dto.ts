import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

const DeleteReimbursementRequestSchema = z.object({
  reimbursement_request_ids: z.array(
    z
      .string({
        description: 'The ids of the reimbursement requests to delete',
        required_error: 'Reimbursement request ids are required',
        invalid_type_error:
          'Reimbursement request ids must be an array of strings',
      })
      .uuid({
        message: 'Reimbursement request ids must be valid uuids',
      }),
    {
      description: 'The ids of the reimbursement requests to delete',
      required_error: 'Reimbursement request ids are required',
      invalid_type_error:
        'Reimbursement request ids must be an array of strings',
    },
  ),
});

export type DeleteReimbursementRequestType = z.infer<
  typeof DeleteReimbursementRequestSchema
>;

export class DeleteReimbursementRequestDTO extends createZodDto(
  DeleteReimbursementRequestSchema,
) {}

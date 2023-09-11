import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

const ReimbursementRequestApprovalSchema = z.object({
  approval_matrix_ids: z
    .array(
      z
        .string({
          description: 'Approval matrix ids of reimbursement request',
          required_error: 'Approval matrix ids is required',
          invalid_type_error: 'Approval matrix ids must be a string of uuid',
        })
        .uuid({
          message: 'Approval matrix id must be a uuid',
        }),
    )
    .min(1, {
      message: 'Approval matrix ids must at least 1 record',
    }),
});

export type ReimbursementRequestApprovalType = z.infer<
  typeof ReimbursementRequestApprovalSchema
>;

export class ReimbursementRequestApprovalDTO extends createZodDto(
  ReimbursementRequestApprovalSchema,
) {}

import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

// TODO: Add description to zod types
const GetAllApprovalReimbursementRequestSchema = z
  .object({
    reimbursement_type_id: z.string().uuid(),
    text_search: z.string().min(1),
    expense_type_ids: z.string().min(1),
    from: z.string().datetime(),
    to: z.string().datetime(),
  })
  .partial();

export type GetAllApprovalReimbursementRequestType = z.infer<
  typeof GetAllApprovalReimbursementRequestSchema
>;

export class GetAllApprovalReimbursementRequestDTO extends createZodDto(
  GetAllApprovalReimbursementRequestSchema,
) {}

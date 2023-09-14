import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

// TODO: Add description to zod types
const GetAllApprovalReimbursementRequestSchema = z
  .object({
    text_search: z.string().nonempty(),
    expense_type_ids: z.array(z.string().uuid()).min(1),
  })
  .partial();

export type GetAllApprovalReimbursementRequestType = z.infer<
  typeof GetAllApprovalReimbursementRequestSchema
>;

export class GetAllApprovalReimbursementRequestDTO extends createZodDto(
  GetAllApprovalReimbursementRequestSchema,
) {}

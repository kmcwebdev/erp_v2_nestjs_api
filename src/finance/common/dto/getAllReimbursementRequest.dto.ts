import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

const GetAllReimbursementRequestSchema = z
  .object({
    reimbursement_type_id: z.string().uuid(),
    expense_type_id: z.string().uuid(),
    requestor_id: z.string().uuid(),
    request_status_id: z.string().uuid(),
    reference_no: z.string(),
    date_filed: z.string().datetime(),
  })
  .partial();

export type GetAllReimbursementRequestType = z.infer<
  typeof GetAllReimbursementRequestSchema
>;

export class GetAllReimbursementRequestDTO extends createZodDto(
  GetAllReimbursementRequestSchema,
) {}

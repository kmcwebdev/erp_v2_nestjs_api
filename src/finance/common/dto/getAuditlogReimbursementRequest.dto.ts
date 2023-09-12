import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

// TODO: Add description to zod types
const GetAuditlogReimbursementRequestSchema = z.object({
  reimbursement_request_id: z.string().uuid(),
  cursor_id: z
    .preprocess((val) => Number(val), z.number().positive())
    .optional(),
});

export type GetAuditlogReimbursementRequestType = z.infer<
  typeof GetAuditlogReimbursementRequestSchema
>;

export class GetAuditlogReimbursementRequestDTO extends createZodDto(
  GetAuditlogReimbursementRequestSchema,
) {}

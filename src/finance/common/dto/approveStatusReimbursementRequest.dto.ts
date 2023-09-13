import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

// TODO: Add description to zod types
const ApproveStatusdReimbursementRequestSchema = z.object({
  reimbursement_request_id: z.string().uuid(),
});

export type ApproveStatusReimbursementRequestType = z.infer<
  typeof ApproveStatusdReimbursementRequestSchema
>;

export class ApproveStatusReimbursementRequestDTO extends createZodDto(
  ApproveStatusdReimbursementRequestSchema,
) {}

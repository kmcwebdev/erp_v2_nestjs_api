import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

// TODO: Add description to zod types
const PendingdReimbursementRequestSchema = z.object({
  reimbursement_request_id: z.string().uuid(),
});

export type PendingReimbursementRequestType = z.infer<
  typeof PendingdReimbursementRequestSchema
>;

export class PendingReimbursementRequestDTO extends createZodDto(
  PendingdReimbursementRequestSchema,
) {}

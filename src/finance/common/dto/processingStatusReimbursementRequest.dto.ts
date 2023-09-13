import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

// TODO: Add description to zod types
const ProcessingStatusdReimbursementRequestSchema = z.object({
  reimbursement_request_id: z.string().uuid(),
});

export type ProcessingStatusReimbursementRequestType = z.infer<
  typeof ProcessingStatusdReimbursementRequestSchema
>;

export class ProcessingStatusReimbursementRequestDTO extends createZodDto(
  ProcessingStatusdReimbursementRequestSchema,
) {}

import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

// TODO: Add description to zod types
const CancelReimbursementRequestSchema = z.object({
  reimbursement_request_id: z.string().uuid(),
});

export type CancelReimbursementRequestType = z.infer<
  typeof CancelReimbursementRequestSchema
>;

export class CancelReimbursementRequestDTO extends createZodDto(
  CancelReimbursementRequestSchema,
) {}

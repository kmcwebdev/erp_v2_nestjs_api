import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

// TODO: Add description to zod types
const OnHoldReimbursementRequestSchema = z.object({
  reimbursement_request_id: z.string().uuid(),
  onhold_reason: z.string().nonempty(),
});

export type OnHoldReimbursementRequestType = z.infer<
  typeof OnHoldReimbursementRequestSchema
>;

export class OnHoldReimbursementRequestDTO extends createZodDto(
  OnHoldReimbursementRequestSchema,
) {}

import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

// TODO: Add description to zod types
const RejectReimbursementRequestSchema = z.object({
  approval_matrix_id: z.string().uuid(),
  rejection_reason: z.string().nonempty(),
});

export type RejectReimbursementRequestType = z.infer<
  typeof RejectReimbursementRequestSchema
>;

export class RejectReimbursementRequestDTO extends createZodDto(
  RejectReimbursementRequestSchema,
) {}

import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

// TODO: Update description and message for schema!
const ReimbursementRequestEmailRejectSchema = z.object({
  hash: z.string().min(1),
});

export type ReimbursementRequestEmailRejectType = z.infer<
  typeof ReimbursementRequestEmailRejectSchema
>;

export class ReimbursementRequestEmailRejectDTO extends createZodDto(
  ReimbursementRequestEmailRejectSchema,
) {}

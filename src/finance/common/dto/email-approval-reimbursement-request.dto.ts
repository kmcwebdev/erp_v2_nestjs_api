import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

// TODO: Update description and message for schema!
const ReimbursementRequestEmailApprovalSchema = z.object({
  token: z.string().nonempty(),
});

export type ReimbursementRequestEmailApprovalType = z.infer<
  typeof ReimbursementRequestEmailApprovalSchema
>;

export class ReimbursementRequestEmailApprovalDTO extends createZodDto(
  ReimbursementRequestEmailApprovalSchema,
) {}

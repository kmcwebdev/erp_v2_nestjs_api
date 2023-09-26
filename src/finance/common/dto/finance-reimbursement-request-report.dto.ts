import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

const FinanceReimbursementRequestReportSchema = z.object({
  reimbursement_request_ids: z.preprocess(
    (val: string) => (val ? JSON.parse(val) : []),
    z.array(z.string().uuid()).min(1),
  ),
});

export type FinanceReimbursementRequestReportType = z.infer<
  typeof FinanceReimbursementRequestReportSchema
>;

export class FinanceReimbursementRequestReportDTO extends createZodDto(
  FinanceReimbursementRequestReportSchema,
) {}

import { z } from 'zod';

// TODO: Add description to zod types
export const ApproveRequestEmailSchema = z.object({
  to: z.array(z.string().email()),
  fullName: z.string().min(1),
  referenceNo: z.string().min(1),
  employeeId: z.string().min(1),
  expenseType: z.string().min(1),
  expenseDate: z.string().min(1),
  amount: z.string().min(1),
  receiptsAttached: z.string().min(1),
});

export type ApproveRequestEmailType = z.infer<typeof ApproveRequestEmailSchema>;

import { z } from 'zod';

// TODO: Add description to zod types
export const HrbpApprovalEmailSchema = z.object({
  to: z.array(z.string().email()),
  referenceNo: z.string().min(1),
  approverFullName: z.string().min(1),
  fullName: z.string().min(1),
  employeeId: z.string().min(1),
  expenseType: z.string().min(1),
  expenseDate: z.string().min(1),
  amount: z.string().min(1),
  receiptsAttached: z.string().min(1),
});

export type HrbpApprovalEmailType = z.infer<typeof HrbpApprovalEmailSchema>;

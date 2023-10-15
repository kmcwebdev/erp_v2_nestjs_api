import { z } from 'zod';

// TODO: Add description to zod types
export const ConfirmationEmailSchema = z.object({
  to: z.array(z.string().email()),
  requestType: z.enum(['scheduled', 'unscheduled']),
  referenceNo: z.string().min(1),
  approverName: z.string().min(1),
  fullName: z.string().min(1),
  employeeId: z.string().min(1),
  expenseType: z.string().min(1),
  expenseDate: z.string().min(1),
  amount: z.string().min(1),
  receiptsAttached: z.string().min(1),
});

export type ConfirmationEmailType = z.infer<typeof ConfirmationEmailSchema>;

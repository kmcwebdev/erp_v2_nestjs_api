import { z } from 'zod';

// TODO: Add description to zod types
export const ConfirmationEmailSchema = z.object({
  to: z.array(z.string().email()),
  requestType: z.enum(['scheduled', 'unscheduled']),
  referenceNo: z.string().nonempty(),
  approverName: z.string().nonempty(),
  fullName: z.string().nonempty(),
  employeeId: z.string().nonempty(),
  expenseType: z.string().nonempty(),
  expenseDate: z.string().nonempty(),
  amount: z.string().nonempty(),
  receiptsAttached: z.string().nonempty(),
});

export type ConfirmationEmailType = z.infer<typeof ConfirmationEmailSchema>;

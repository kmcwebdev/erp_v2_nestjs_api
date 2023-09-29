import { z } from 'zod';

// TODO: Add description to zod types
export const ApproveRequestEmailSchema = z.object({
  to: z.array(z.string().email()),
  fullName: z.string().nonempty(),
  employeeId: z.string().nonempty(),
  expenseType: z.string().nonempty(),
  expenseDate: z.string().nonempty(),
  amount: z.string().nonempty(),
  receiptsAttached: z.string().nonempty(),
});

export type ApproveRequestEmailType = z.infer<typeof ApproveRequestEmailSchema>;

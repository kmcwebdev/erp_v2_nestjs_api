import { z } from 'zod';

// TODO: Add description to zod types
export const RejectRequestEmailSchema = z.object({
  to: z.array(z.string().email()),
  fullName: z.string().nonempty(),
  employeeId: z.string().nonempty(),
  expenseType: z.string().nonempty(),
  expenseDate: z.string().nonempty(),
  amount: z.string().nonempty(),
  receiptsAttached: z.string().nonempty(),
  remarks: z.string().nonempty(),
});

export type RejectRequestEmailType = z.infer<typeof RejectRequestEmailSchema>;
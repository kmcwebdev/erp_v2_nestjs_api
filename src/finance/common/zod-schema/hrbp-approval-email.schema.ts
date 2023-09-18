import { z } from 'zod';

// TODO: Add description to zod types
export const HrbpApprovalEmailSchema = z.object({
  to: z.array(z.string().email()),
  approverFullName: z.string().nonempty(),
  fullName: z.string().nonempty(),
  employeeId: z.string().nonempty(),
  expenseType: z.string().nonempty(),
  expenseDate: z.string().nonempty(),
  amount: z.string().nonempty(),
  receiptsAttached: z.string().nonempty(),
});

export type HrbpApprovalEmailType = z.infer<typeof HrbpApprovalEmailSchema>;

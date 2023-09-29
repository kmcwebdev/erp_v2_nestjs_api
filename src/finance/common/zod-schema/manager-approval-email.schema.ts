import { z } from 'zod';

// TODO: Add description to zod types
export const ManagerApprovalEmailSchema = z.object({
  to: z.array(z.string().email()),
  referenceNo: z.string().nonempty(),
  approverFullName: z.string().nonempty(),
  fullName: z.string().nonempty(),
  employeeId: z.string().nonempty(),
  expenseType: z.string().nonempty(),
  expenseDate: z.string().nonempty(),
  amount: z.string().nonempty(),
  receiptsAttached: z.string().nonempty(),
  approvalLink: z.string().url().optional(),
  rejectionLink: z.string().url().optional(),
});

export type ManagerApprovalEmailType = z.infer<
  typeof ManagerApprovalEmailSchema
>;

import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

const GetAllReimbursementRequestSchema = z
  .object({
    reimbursement_type_id: z.string().uuid(),
    expense_type_id: z.string().uuid(),
    requestor_id: z.string().uuid(),
    request_status_id: z.string().uuid(),
    reference_no: z.string().nonempty(),
    amount_min: z.number().positive(),
    amount_max: z.number().positive(),
    date_filed: z.string().datetime(),
    text_search: z.string().nonempty(),
  })
  .partial()
  .refine(
    (input) => {
      if (input?.amount_min && input?.amount_max) {
        return input.amount_min <= input.amount_max;
      }

      if (input?.amount_min && !input?.amount_max) {
        return false;
      }

      if (!input?.amount_min && input?.amount_max) {
        return false;
      }

      return true;
    },
    {
      path: ['amount_min', 'amount_max'],
      message: 'amount_min must be less than or equal to amount_max',
    },
  );

export type GetAllReimbursementRequestType = z.infer<
  typeof GetAllReimbursementRequestSchema
>;

export class GetAllReimbursementRequestDTO extends createZodDto(
  GetAllReimbursementRequestSchema,
) {}

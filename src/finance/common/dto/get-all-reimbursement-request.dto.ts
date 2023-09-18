import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

const GetAllReimbursementRequestSchema = z
  .object({
    reimbursement_type_id: z
      .string({
        description: 'reimbursement_type_id',
        invalid_type_error: 'reimbursement_type_id must be a string',
      })
      .uuid({
        message: 'reimbursement_type_id must be a valid uuid',
      }),
    expense_type_id: z
      .string({
        description: 'expense_type_id',
        invalid_type_error: 'expense_type_id must be a string',
      })
      .uuid({
        message: 'expense_type_id must be a valid uuid',
      }),
    requestor_id: z
      .string({
        description: 'requestor_id',
        invalid_type_error: 'requestor_id must be a string',
      })
      .uuid({
        message: 'requestor_id must be a valid uuid',
      }),
    request_status_id: z.array(
      z
        .string({
          description: 'request_status_id',
          invalid_type_error: 'request_status_id must be a string',
        })
        .uuid({
          message: 'request_status_id must be a valid uuid',
        }),
    ),
    reference_no: z
      .string({
        description: 'reference_no',
        invalid_type_error: 'reference_no must be a string',
      })
      .nonempty({
        message: 'reference_no must not be empty',
      }),
    amount_min: z
      .number({
        description: 'amount_min',
        invalid_type_error: 'amount_min must be a number',
      })
      .positive({
        message: 'amount_min must be a positive number',
      }),
    amount_max: z
      .number({
        description: 'amount_max',
        invalid_type_error: 'amount_max must be a number',
      })
      .positive({
        message: 'amount_max must be a positive number',
      }),
    date_filed: z
      .string({
        description: 'date_filed',
        invalid_type_error: 'date_filed must be a string',
      })
      .datetime({
        message: 'date_filed must be a valid datetime',
      }),
    text_search: z
      .string({
        description: 'text_search',
        invalid_type_error: 'text_search must be a string',
      })
      .nonempty({
        message: 'text_search must not be empty',
      }),
    page_limit: z.preprocess(
      (val) => Number(val),
      z
        .number({
          description: 'page_limit',
          invalid_type_error: 'page_limit must be a number',
        })
        .positive({
          message: 'page_limit must be a positive number',
        }),
    ),
    last_id: z.preprocess(
      (val) => Number(val),
      z
        .number({
          description: 'last_id',
          invalid_type_error: 'last_id must be a number',
        })
        .positive({
          message: 'last_id must be a positive number',
        }),
    ),
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

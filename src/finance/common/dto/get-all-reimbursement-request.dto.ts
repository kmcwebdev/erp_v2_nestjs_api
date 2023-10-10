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
    history: z.preprocess(
      (val) => (val === 'true' ? true : false),
      z.boolean().default(false),
    ),
    // TODO: Add message and description for this
    expense_type_ids: z.string().nonempty(),
    from: z.string().datetime(),
    to: z.string().datetime(),
  })
  .partial()
  .refine(
    (input) => {
      if (input?.amount_min && input?.amount_max) {
        return input.amount_min <= input.amount_max;
      }

      if (input?.amount_min && !input?.amount_max) {
        input.amount_max = 999_999_999;
      }

      if (!input?.amount_min && input?.amount_max) {
        input.amount_min = 1;
      }

      return true;
    },
    {
      path: ['amount_min', 'amount_max'],
      message: 'Get all request schema error',
    },
  );

export type GetAllReimbursementRequestType = z.infer<
  typeof GetAllReimbursementRequestSchema
>;

export class GetAllReimbursementRequestDTO extends createZodDto(
  GetAllReimbursementRequestSchema,
) {}

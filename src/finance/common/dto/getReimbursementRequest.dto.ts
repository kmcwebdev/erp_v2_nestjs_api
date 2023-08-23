import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

const GetReimbursementRequestSchema = z
  .object({
    requestor_id: z
      .string({
        description: 'The id of the requestor',
        invalid_type_error: 'requestor_id must be a string',
      })
      .uuid({
        message: 'requestor_id must be a valid uuid',
      }),
    reimbursement_request_type_id: z
      .string({
        description: 'The id of the reimbursement request type',
        invalid_type_error: 'reimbursement_request_type_id must be a string',
      })
      .uuid({
        message: 'reimbursement_request_type_id must be a valid uuid',
      }),
    expense_type_id: z
      .string({
        description: 'The id of the expense type',
        invalid_type_error: 'expense_type_id must be a string',
      })
      .uuid({
        message: 'expense_type_id must be a valid uuid',
      }),
    request_status_id: z
      .string({
        description: 'The id of the request status',
        invalid_type_error: 'request_status_id must be a string',
      })
      .uuid({
        message: 'request_status_id must be a valid uuid',
      }),
    min_amount: z
      .number({
        description: 'The minimum amount of the reimbursement request',
        invalid_type_error: 'min_amount must be a number',
      })
      .min(1, {
        message: 'min_amount must be greater than 0',
      }),
    max_amount: z
      .number({
        description: 'The maximum amount of the reimbursement request',
        invalid_type_error: 'max_amount must be a number',
      })
      .min(1, {
        message: 'max_amount must be greater than 0',
      })
      .max(1_000_000_000, {
        message: 'max_amount must be less than 1,000,000,000',
      })
      .default(1_000_000_000),
    approve_date: z
      .string({
        description: 'The date the reimbursement request was approved',
        invalid_type_error: 'approve_date must be a string',
      })
      .datetime({
        message: 'approve_date must be a valid datetime',
      }),
    created_at: z
      .string({
        description: 'The date the reimbursement request was created',
        invalid_type_error: 'created_at must be a string',
      })
      .datetime({
        message: 'created_at must be a valid datetime',
      }),
  })
  .partial();

export type GetReimbursementRequestType = z.infer<
  typeof GetReimbursementRequestSchema
>;

export class GetReimbursementRequestDTO extends createZodDto(
  GetReimbursementRequestSchema,
) {}

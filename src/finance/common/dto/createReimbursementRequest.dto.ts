import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

const CreateReimbursementReqeustSchema = z.object({
  reimbursement_request_type_id: z
    .string({
      description: 'The id of the reimbursement request type',
      required_error: 'Reimbursement request type id is required',
      invalid_type_error: 'Reimbursement request type id must be a string',
    })
    .uuid({
      message: 'Reimbursement request type id must be a valid uuid',
    }),
  expense_type_id: z
    .string({
      description: 'The id of the expense type',
      required_error: 'Expense type id is required',
      invalid_type_error: 'Expense type id must be a string',
    })
    .uuid({
      message: 'Expense type id must be a valid uuid',
    }),
  attachment: z
    .string({
      description: 'The attachment of the expense',
      required_error: 'Attachment is required',
      invalid_type_error: 'Attachment must be a string',
    })
    .url({
      message: 'Attachment must be a valid url',
    }),
  amount: z
    .number({
      description: 'The amount of the expense',
      required_error: 'Amount is required',
      invalid_type_error: 'Amount must be a number',
    })
    .min(1, {
      message: 'Amount must be at least 1',
    }),
});

export type CreateReimbursementRequestType = z.infer<
  typeof CreateReimbursementReqeustSchema
>;

export class CreateReimbursementRequestDTO extends createZodDto(
  CreateReimbursementReqeustSchema,
) {}

import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { EXPENSE_TYPE_OTHERS, UNSCHEDULED_ID } from '../constant';

const CreateReimbursementReqeustSchema = z
  .object({
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
    approvers: z
      .array(
        z
          .string({
            description: 'The list of approvers for the reimbursement request',
            invalid_type_error: 'Approvers must be an array',
          })
          .email({
            message: 'Approvers must be a valid email',
          }),
        {},
      )
      .optional(),
    remarks: z
      .string({
        description: 'The remarks for the reimbursement request',
        invalid_type_error: 'Remarks must be a string',
      })
      .nonempty({
        message: 'Remarks cannot be empty',
      })
      .optional(),
  })
  .refine(
    (input) => {
      if (input.reimbursement_request_type_id === UNSCHEDULED_ID) {
        return input?.approvers ? input.approvers.length > 0 : false;
      }

      if (input.expense_type_id === EXPENSE_TYPE_OTHERS) {
        return input?.remarks ? input.remarks.length > 0 : false;
      }

      return true;
    },
    {
      path: ['approvers', 'remarks'],
      message:
        'Approvers is required for unscheduled reimbursement request type and remarks is required for expense type others',
    },
  );

export type CreateReimbursementRequestType = z.infer<
  typeof CreateReimbursementReqeustSchema
>;

export class CreateReimbursementRequestDTO extends createZodDto(
  CreateReimbursementReqeustSchema,
) {}

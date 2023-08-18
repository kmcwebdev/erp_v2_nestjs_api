import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

const UpdateReimbursementRequest = z
  .object({
    action: z
      .enum(
        [
          'update',
          'approve',
          'cancel',
          'reject',
          'on-hold',
          'processing',
          'credited',
        ],
        {
          description: 'The action to be performed',
          invalid_type_error: 'Action must be a string',
        },
      )
      .default('update'),
    requests: z.array(
      z.object({
        reimbursement_request_id: z
          .string({
            description: 'The id of the reimbursement request',
            required_error: 'Reimbursement request id is required',
            invalid_type_error: 'Reimbursement request id must be a string',
          })
          .uuid({
            message: 'Reimbursement request id must be a valid uuid',
          }),
        notes: z
          .string({
            description: 'The notes for the reimbursement request',
            invalid_type_error: 'Notes must be a string',
          })
          .optional(),
      }),
      {
        description: 'The list of reimbursement requests to be updated',
        required_error: 'Requests is required',
        invalid_type_error: 'Requests must be an array',
      },
    ),
  })
  .refine(
    (input) => {
      // If the action is update, then we don't need to check for notes
      if (input.action === 'update') {
        const hasNotes = input.requests.every(
          (request) => request.notes === undefined,
        );

        return hasNotes;
      }

      // If the action is approve, then we don't need to check for notes
      if (['cancel', 'reject', 'on-hold'].includes(input.action)) {
        return input.requests.every(
          (request) =>
            typeof request.notes === 'string' && request.notes.length > 0,
        );
      }

      return true;
    },
    {
      message:
        'If the action is update, then notes should not be provided else if action are the following (cancel, reject, or on-hold) it should be provided',
      path: ['requests', 'notes'],
    },
  );

export type UpdateReimbursementRequestType = z.infer<
  typeof UpdateReimbursementRequest
>;

export class UpdateReimbursementRequestDTO extends createZodDto(
  UpdateReimbursementRequest,
) {}

import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const UpdatePropelauthUserRoleSchema = z.object({
  org_id: z
    .string({
      description: 'The propelauth organization id',
      required_error: 'Organization id is required',
      invalid_type_error: 'Organization id must be a string',
    })
    .uuid({
      message: 'Organization id must be a valid uuid',
    }),
  user_id: z
    .string({
      description: 'The propelauth user id',
      invalid_type_error: 'User id must be a string',
    })
    .uuid({
      message: 'User id must be a valid uuid',
    })
    .optional(),
  role: z.enum(
    ['Member', 'HRBP', 'Finance', 'External Reimbursement Approver Manager'],
    {
      description: 'The propelauth user role',
      required_error: 'User role is required',
      invalid_type_error: 'User role must be a string',
    },
  ),
});

export type UpdatePropelauthUserRoleType = z.infer<
  typeof UpdatePropelauthUserRoleSchema
>;

export class UpdatePropelauthUserRoleDTO extends createZodDto(
  UpdatePropelauthUserRoleSchema,
) {}

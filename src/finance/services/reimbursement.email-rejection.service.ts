import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { propelauth } from 'src/auth/common/lib/propelauth';
import { ReimbursementRejectService } from './reimbursement.reject.service';
import { DB } from 'src/common/types';
import { ReimbursementRequestEmailRejectType } from '../common/dto/email-rejection-reimbursement-request.dto';

@Injectable()
export class ReimbursementEmailRejectionService {
  private readonly logger = new Logger(ReimbursementEmailRejectionService.name);

  constructor(
    private readonly reimbursementRejectService: ReimbursementRejectService,
    @InjectKysely() private readonly pgsql: DB,
  ) {}

  async reject(data: ReimbursementRequestEmailRejectType) {
    const result = await this.pgsql.transaction().execute(async (trx) => {
      const approvalToken = await trx
        .selectFrom('finance_reimbursement_approval_links as fral')
        .select([
          'fral.reimbursement_request_id',
          'fral.approver_matrix_id',
          'fral.token',
        ])
        .where('fral.link_expired', '=', false)
        .where('fral.hash', '=', data.hash)
        .executeTakeFirst();

      if (!approvalToken) {
        throw new HttpException(
          'Approval link not found or has expired',
          HttpStatus.NOT_FOUND,
        );
      }

      const propelauthUser = await propelauth.validateAccessTokenAndGetUser(
        `Bearer ${approvalToken.token}`,
      );

      const userMetadata = await propelauth.fetchUserMetadataByUserId(
        propelauthUser.userId,
        true,
      );

      const usersProperty = Object.values(userMetadata.orgIdToOrgInfo).map(
        (orgMemberInfo) => ({
          orgId: orgMemberInfo.orgId,
          orgName: orgMemberInfo.orgName,
          userAssignedRole: orgMemberInfo.assignedRole,
          usersPermission: orgMemberInfo.permissions,
        }),
      );

      const userFromDb = await trx
        .selectFrom('users')
        .select([
          'users.user_id',
          'users.full_name',
          'users.hrbp_approver_email',
        ])
        .where('users.propelauth_user_id', '=', propelauthUser.userId)
        .executeTakeFirst();

      await this.reimbursementRejectService.reject(
        {
          original_user_id: userFromDb.user_id,
          hrbp_approver_email: userFromDb.hrbp_approver_email,
          user_assigned_role: usersProperty[0].userAssignedRole.toLowerCase(),
          permissions: usersProperty[0].usersPermission,
          ...propelauthUser,
        },
        {
          approval_matrix_id: approvalToken.approver_matrix_id,
          rejection_reason: 'Rejected via email action',
        },
      );

      await this.pgsql
        .updateTable('finance_reimbursement_approval_links as fral')
        .set({
          link_expired: true,
          token: null,
        })
        .where('fral.hash', '=', data.hash)
        .execute();

      return 'OK';
    });

    return result;
  }
}

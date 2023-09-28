import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectKysely } from 'nestjs-kysely';
import { DB } from 'src/common/types';
import { REJECTED_REQUEST } from '../common/constant';
import { RequestUser } from 'src/auth/common/interface/propelauthUser.interface';
import { RejectRequestEmailType } from '../common/zod-schema/reject-request-email.schema';
import { RejectReimbursementRequestType } from '../common/dto/reject-reimbursement-request.dto';

@Injectable()
export class ReimbursementRejectService {
  private readonly logger = new Logger(ReimbursementRejectService.name);

  constructor(
    @InjectKysely() private readonly pgsql: DB,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async reject(user: RequestUser, data: RejectReimbursementRequestType) {
    const finance = user.user_assigned_role === 'finance';

    if (finance) {
      // TODO: If the view is finance dashboard the UI is still passing
      // the approval_matrix_id property along with the reimbursement_request_id
      const reimbursement_request_id_placeholder = data.approval_matrix_id;

      const rejectByReimbursementRequestId = await this.pgsql
        .transaction()
        .execute(async (trx) => {
          const reimbursementRequest = await trx
            .updateTable('finance_reimbursement_requests')
            .set({
              request_status_id: REJECTED_REQUEST,
              hrbp_request_status_id: REJECTED_REQUEST,
              finance_request_status_id: REJECTED_REQUEST,
            })
            .returning([
              'finance_reimbursement_requests.reimbursement_request_id',
            ])
            .where(
              'finance_reimbursement_requests.reimbursement_request_id',
              '=',
              reimbursement_request_id_placeholder,
            )
            .executeTakeFirstOrThrow();

          await trx
            .insertInto('finance_reimbursement_approval_audit_logs')
            .values({
              reimbursement_request_id:
                reimbursementRequest.reimbursement_request_id,
              user_id: user.original_user_id,
              description: `[REJECTED]: ${data.rejection_reason}`,
            })
            .execute();

          return reimbursementRequest;
        });

      return {
        reimbursement_request_id:
          rejectByReimbursementRequestId.reimbursement_request_id,
        finance_request_status: 'Rejected',
        rejection_reason: data.rejection_reason,
      };
    }

    const rejectReimbursementRequest = await this.pgsql
      .transaction()
      .execute(async (trx) => {
        const reimbursementRequestMatrix = await trx
          .updateTable('finance_reimbursement_approval_matrix')
          .set({
            has_rejected: true,
            performed_by_user_id: user.original_user_id,
            description: data.rejection_reason,
            updated_at: new Date(),
          })
          .where(
            'finance_reimbursement_approval_matrix.approval_matrix_id',
            '=',
            data.approval_matrix_id,
          )
          .where(
            'finance_reimbursement_approval_matrix.has_approved',
            '=',
            false,
          )
          .where(
            'finance_reimbursement_approval_matrix.has_rejected',
            '=',
            false,
          )
          .returning([
            'finance_reimbursement_approval_matrix.reimbursement_request_id',
          ])
          .executeTakeFirstOrThrow();

        if (!reimbursementRequestMatrix) {
          return {
            message: 'This request is already approved or rejected',
          };
        }

        const reimbursementRequest = await trx
          .updateTable('finance_reimbursement_requests')
          .set({
            request_status_id: REJECTED_REQUEST,
            hrbp_request_status_id: REJECTED_REQUEST,
            finance_request_status_id: REJECTED_REQUEST,
          })
          .returning([
            'finance_reimbursement_requests.reimbursement_request_id',
            'finance_reimbursement_requests.expense_type_id',
            'finance_reimbursement_requests.requestor_id',
            'finance_reimbursement_requests.amount',
            'finance_reimbursement_requests.attachment',
            'finance_reimbursement_requests.created_at',
          ])
          .where(
            'finance_reimbursement_requests.reimbursement_request_id',
            '=',
            reimbursementRequestMatrix.reimbursement_request_id,
          )
          .executeTakeFirstOrThrow();

        const expenseType = await trx
          .selectFrom('finance_reimbursement_expense_types')
          .select('finance_reimbursement_expense_types.expense_type')
          .where(
            'finance_reimbursement_expense_types.expense_type_id',
            '=',
            reimbursementRequest.expense_type_id,
          )
          .executeTakeFirstOrThrow();

        const requestor = await trx
          .selectFrom('users')
          .select(['users.email', 'users.full_name', 'employee_id'])
          .where('users.user_id', '=', reimbursementRequest.requestor_id)
          .executeTakeFirstOrThrow();

        const emailRejectionData: RejectRequestEmailType = {
          to: [requestor.email],
          fullName: requestor.full_name,
          employeeId: requestor.employee_id,
          expenseType: expenseType.expense_type,
          expenseDate: reimbursementRequest.created_at.toString(),
          amount: reimbursementRequest.amount,
          receiptsAttached: reimbursementRequest.attachment,
          remarks: data.rejection_reason,
        };

        this.eventEmitter.emit(
          'reimbursement-request-send-email-rejection',
          emailRejectionData,
        );

        return {
          reimbursement_request_id:
            reimbursementRequest.reimbursement_request_id,
          request_status: 'Rejected',
          rejection_reason: data.rejection_reason,
        };
      });

    return rejectReimbursementRequest;
  }
}

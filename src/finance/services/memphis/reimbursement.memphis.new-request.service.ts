import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { Consumer, MemphisService, Message, Producer } from 'memphis-dev';
import { InjectKysely } from 'nestjs-kysely';
import { DB } from 'src/common/types';
import { UsersApiService } from 'src/users/services/users.api.service';
import { ReimbursementRequest } from 'src/finance/common/interface/getOneRequest.interface';
import { ConfirmationEmailType } from 'src/finance/common/zod-schema/confirmation-email.schema';
import { HrbpApprovalEmailType } from 'src/finance/common/zod-schema/hrbp-approval-email.schema';
import { ManagerApprovalEmailType } from 'src/finance/common/zod-schema/manager-approval-email.schema';
import { SCHEDULED_REQUEST, UNSCHEDULED_REQUEST } from '../../common/constant';

@Injectable()
export class ReimbursementMemphisNewRequestService implements OnModuleInit {
  private readonly logger = new Logger(
    ReimbursementMemphisNewRequestService.name,
  );

  consumer: Consumer;
  producer: Producer;

  constructor(
    @InjectKysely() private readonly pgsql: DB,
    private readonly configService: ConfigService,
    private readonly memphisService: MemphisService,
    private readonly eventEmitter: EventEmitter2,
    private readonly usersApiService: UsersApiService,
  ) {}

  @OnEvent('reimbursement-request-created')
  async triggerMemphisEvent(data: ReimbursementRequest) {
    return await this.producer.produce({
      message: Buffer.from(JSON.stringify(data)),
    });
  }

  async onModuleInit() {
    try {
      this.consumer = await this.memphisService.consumer({
        stationName: 'erp.reimbursement.new-request',
        consumerName: 'erp.reimbursement.new-request.consumer-name',
        consumerGroup: 'erp.reimbursement.new-request.consumer-group',
      });

      this.consumer.on('message', async (message: Message) => {
        const data: ReimbursementRequest = JSON.parse(
          message.getData().toString(),
        );

        // TODO: Convert query to transaction mode

        const newRequest = data;

        await this.pgsql
          .updateTable('finance_reimbursement_requests')
          .set({
            attachment_mask_name: `${
              newRequest?.full_name
                ? newRequest.full_name.replace(/\s+/g, '_')
                : 'no_name'
            }_${newRequest?.reference_no}`.toUpperCase(),
          })
          .where(
            'finance_reimbursement_requests.reimbursement_request_id',
            '=',
            data.reimbursement_request_id,
          )
          .execute();

        if (!newRequest.hrbp_approver_email) {
          return message.ack();
        }

        if (newRequest.request_type_id === SCHEDULED_REQUEST) {
          const hrbp = await this.pgsql
            .selectFrom('users')
            .innerJoin(
              'finance_reimbursement_approvers',
              'finance_reimbursement_approvers.signatory_id',
              'users.user_id',
            )
            .select([
              'finance_reimbursement_approvers.approver_id',
              'users.user_id',
              'users.email',
              'users.full_name',
            ])
            .where(
              'finance_reimbursement_approvers.table_reference',
              '=',
              'users',
            )
            .where('users.email', '=', newRequest.hrbp_approver_email)
            .executeTakeFirst();

          if (!hrbp) {
            this.logger.error('HRBP is not a user of the system');

            return message.ack();
          }

          await this.pgsql
            .insertInto('finance_reimbursement_approval_matrix')
            .values([
              {
                reimbursement_request_id: newRequest.reimbursement_request_id,
                approver_id: hrbp.approver_id,
                approver_order: 1,
                is_hrbp: true,
              },
            ])
            .execute();

          const confirmationEmailData: ConfirmationEmailType = {
            to: [newRequest.email],
            requestType: 'scheduled',
            referenceNo: newRequest.reference_no,
            approverName: hrbp?.full_name || 'No name set',
            fullName: newRequest?.full_name || 'No name set',
            employeeId: newRequest?.employee_id || 'No emp id set',
            expenseType: newRequest.expense_type,
            expenseDate: newRequest.created_at,
            amount: newRequest.amount,
            receiptsAttached: newRequest.attachment,
          };

          this.eventEmitter.emit(
            'reimbursement-request-send-email-confirmation',
            confirmationEmailData,
          );

          const hrbpApprovalEmailData: HrbpApprovalEmailType = {
            to: [newRequest.hrbp_approver_email],
            referenceNo: newRequest.reference_no,
            approverFullName: hrbp.full_name || 'HRBP',
            fullName: newRequest?.full_name || 'No name set',
            employeeId: newRequest?.employee_id || 'No employee id set',
            expenseType: newRequest.expense_type,
            expenseDate: newRequest.created_at,
            amount: newRequest.amount,
            receiptsAttached: newRequest.attachment,
          };

          this.eventEmitter.emit(
            'reimbursement-request-send-email-hrbp-approval',
            hrbpApprovalEmailData,
          );
        }

        if (newRequest.request_type_id === UNSCHEDULED_REQUEST) {
          if (newRequest?.dynamic_approvers) {
            const approvers = newRequest.dynamic_approvers.split(',');
            approvers.forEach(async (email) => {
              await this.pgsql.transaction().execute(async (trx) => {
                const propelauthUser =
                  await this.usersApiService.fetchUserInPropelauthByEmail(
                    email,
                  );

                if (!propelauthUser) {
                  await this.usersApiService.createUserInPropelauth(
                    email,
                    'External Reimbursement Approver Manager',
                  );
                }

                let approverManager = await trx
                  .selectFrom('users')
                  .innerJoin(
                    'finance_reimbursement_approvers',
                    'finance_reimbursement_approvers.signatory_id',
                    'users.user_id',
                  )
                  .select([
                    'finance_reimbursement_approvers.approver_id',
                    'users.user_id',
                    'users.email',
                    'users.full_name',
                  ])
                  .where(
                    'finance_reimbursement_approvers.table_reference',
                    '=',
                    'users',
                  )
                  .where('users.email', '=', email)
                  .executeTakeFirst();

                if (!approverManager) {
                  const dbUser =
                    await this.usersApiService.createOrGetUserInDatabase({
                      email,
                    });

                  const newApprover = await trx
                    .insertInto('finance_reimbursement_approvers')
                    .values({
                      signatory_id: dbUser.user_id,
                      table_reference: 'users',
                      is_group_of_approvers: false,
                    })
                    .returning(['finance_reimbursement_approvers.approver_id'])
                    .executeTakeFirst();

                  approverManager = {
                    approver_id: newApprover.approver_id,
                    user_id: dbUser.user_id,
                    email: dbUser.email,
                    full_name: dbUser.full_name,
                  };
                }

                const hrbp = await trx
                  .selectFrom('users')
                  .innerJoin(
                    'finance_reimbursement_approvers',
                    'finance_reimbursement_approvers.signatory_id',
                    'users.user_id',
                  )
                  .select([
                    'finance_reimbursement_approvers.approver_id',
                    'users.email',
                    'users.full_name',
                  ])
                  .where(
                    'finance_reimbursement_approvers.table_reference',
                    '=',
                    'users',
                  )
                  .where('users.email', '=', newRequest.hrbp_approver_email)
                  .executeTakeFirst();

                const approvers = await trx
                  .insertInto('finance_reimbursement_approval_matrix')
                  .values([
                    {
                      reimbursement_request_id:
                        newRequest.reimbursement_request_id,
                      approver_id: approverManager.approver_id,
                      approver_order: 1,
                      is_hrbp: false,
                    },
                    {
                      reimbursement_request_id:
                        newRequest.reimbursement_request_id,
                      approver_id: hrbp.approver_id,
                      approver_order: 2,
                      is_hrbp: true,
                    },
                  ])
                  .returning(
                    'finance_reimbursement_approval_matrix.approval_matrix_id',
                  )
                  .executeTakeFirst();

                const randomBytes = crypto.randomBytes(16);
                const actionToken = randomBytes.toString('hex');

                const approveLink = `${this.configService.get(
                  'FRONT_END_URL',
                )}/email-action/approve/${actionToken}`;

                const rejectLink = `${this.configService.get(
                  'FRONT_END_URL',
                )}/email-action/reject/${actionToken}`;

                await trx
                  .insertInto('finance_reimbursement_approval_links')
                  .values({
                    reimbursement_request_id:
                      newRequest.reimbursement_request_id,
                    approve_link: approveLink,
                    rejection_link: rejectLink,
                    approver_matrix_id: approvers.approval_matrix_id,
                    token: actionToken,
                    link_expired: false,
                  })
                  .execute();

                const confirmationEmailData: ConfirmationEmailType = {
                  to: [newRequest.email],
                  requestType: 'unscheduled',
                  referenceNo: newRequest.reference_no,
                  approverName: hrbp?.full_name || 'No name set',
                  fullName: newRequest?.full_name || 'No name set',
                  employeeId: newRequest?.employee_id || 'No emp id set',
                  expenseType: newRequest.expense_type,
                  expenseDate: newRequest.created_at,
                  amount: newRequest.amount,
                  receiptsAttached: newRequest.attachment,
                };

                this.eventEmitter.emit(
                  'reimbursement-request-send-email-confirmation',
                  confirmationEmailData,
                );

                const managerApprovalEmailData: ManagerApprovalEmailType = {
                  to: [email],
                  referenceNo: newRequest.reference_no,
                  approverFullName: email,
                  fullName: newRequest.full_name,
                  employeeId: newRequest.employee_id,
                  expenseType: newRequest.expense_type,
                  expenseDate: newRequest.created_at,
                  amount: newRequest.amount,
                  receiptsAttached: newRequest.attachment,
                  approvalLink: approveLink,
                  rejectionLink: rejectLink,
                };

                this.eventEmitter.emit(
                  'reimbursement-request-send-email-manager-approval',
                  managerApprovalEmailData,
                );
              });
            });
          }
        }

        message.ack();
      });

      this.producer = await this.memphisService.producer({
        stationName: 'erp.reimbursement.new-request',
        producerName: 'erp.reimbursement.new-request.producer-name',
      });

      this.logger.log(
        'Memphis reimbursement new request station is ready 💵 🚀',
      );
    } catch (error: any) {
      this.logger.error(error.message);
    }
  }
}

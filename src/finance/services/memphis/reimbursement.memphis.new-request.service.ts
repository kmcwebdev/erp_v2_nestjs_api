import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { catchError, firstValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { Consumer, MemphisService, Message, Producer } from 'memphis-dev';
import { InjectKysely } from 'nestjs-kysely';
import { DB } from 'src/common/types';
import { UsersApiService } from 'src/users/services/users.api.service';
import { SCHEDULED_REQUEST, UNSCHEDULED_REQUEST } from '../../common/constant';
import { ReimbursementRequest } from 'src/finance/common/interface/getOneRequest.interface';
import { ConfirmationEmailType } from 'src/finance/common/zod-schema/confirmation-email.schema';
import { HrbpApprovalEmailType } from 'src/finance/common/zod-schema/hrbp-approval-email.schema';
import { ManagerApprovalEmailType } from 'src/finance/common/zod-schema/manager-approval-email.schema';
import { GeneratePropelauthLongliveAccessTokenType } from 'src/auth/common/dto/generate-propelauth-longlive-access-token.dto';

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
    private readonly httpService: HttpService,
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

  async generatePropelauthLongliveAcessToken(
    data: GeneratePropelauthLongliveAccessTokenType,
  ): Promise<{ access_token: string }> {
    const { data: response } = await firstValueFrom(
      this.httpService
        .post(
          '/api/backend/v1/access_token',
          {
            duration_in_minutes: 2880,
            user_id: data.user_id,
          },
          {
            baseURL: this.configService.get('PROPELAUTH_AUTH_URL'),
            headers: {
              Authorization: `Bearer ${this.configService.get(
                'PROPELAUTH_API_KEY',
              )}`,
            },
          },
        )
        .pipe(
          catchError(() => {
            throw 'Failed to generate long live access token';
          }),
        ),
    );

    this.logger.log('Generate success for propelauth long live access token');

    return response;
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
                const approveMyOwnRequestAsMyOwnManager = await trx
                  .selectFrom('users')
                  .select('users.email')
                  .where('users.user_id', '=', newRequest.requestor_id)
                  .executeTakeFirst();

                if (approveMyOwnRequestAsMyOwnManager) {
                  if (approveMyOwnRequestAsMyOwnManager.email === email) {
                    throw new Error('Nope not gonna happen 🤪');
                  }
                }

                let propelauth_user_id = '';

                const propelauthUser =
                  await this.usersApiService.fetchUserInPropelauthByEmail(
                    email,
                  );

                propelauth_user_id = propelauthUser.userId;

                if (!propelauthUser) {
                  const newPropelauthUser =
                    await this.usersApiService.createUserInPropelauth(
                      email,
                      'External Reimbursement Approver Manager',
                    );

                  propelauth_user_id = newPropelauthUser.userId;
                }

                if (!propelauth_user_id) {
                  throw new Error('Propelauth user id not populated with data');
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
                    'users.propelauth_user_id',
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
                      propelauth_user_id,
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
                    propelauth_user_id,
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
                  .execute();

                const userToken =
                  await this.generatePropelauthLongliveAcessToken({
                    user_id: propelauth_user_id,
                  })
                    .then((data) => data.access_token)
                    .catch(() => {
                      throw new Error(
                        'Failed to fetch user propel access token',
                      );
                    });

                function createHash(data: string) {
                  const hash = crypto.createHash('sha256');

                  hash.update(data);

                  return hash.digest('hex');
                }

                const hash = createHash(newRequest.reimbursement_request_id);

                // TODO: Clean this shit
                const approveLink = `${this.configService.get(
                  'FRONT_END_URL',
                )}/email-action/approve/${hash}?requestor=${
                  newRequest.full_name || 'no_name'
                }&rid=${newRequest.reference_no}`;

                console.log(approveLink);

                const rejectLink = `${this.configService.get(
                  'FRONT_END_URL',
                )}/email-action/reject/${hash}?requestor=${
                  newRequest.full_name || 'no_name'
                }&rid=${newRequest.reference_no}`;

                console.log(rejectLink);

                await trx
                  .insertInto('finance_reimbursement_approval_links')
                  .values({
                    reimbursement_request_id:
                      newRequest.reimbursement_request_id,
                    approve_link: approveLink,
                    rejection_link: rejectLink,
                    approver_matrix_id: approvers[0].approval_matrix_id,
                    token: userToken,
                    hash,
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

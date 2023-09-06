import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Consumer, MemphisService, Message, Producer } from 'memphis-dev';
import { Reimbursement } from '../common/interface/reimbursement.interface';
import { InjectKysely } from 'nestjs-kysely';
import { DB } from 'src/common/types';
import * as crypto from 'crypto';
import {
  GROUP_APPROVERS_BILLING,
  GROUP_APPROVERS_TREASURY,
  GROUP_APPROVER_PAYABLES,
  SCHEDULED_REQUEST,
  UNSCHEDULED_REQUEST,
} from '../common/constant';
import { HttpService } from '@nestjs/axios';
import { catchError, firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

@Injectable()
export class ReimbursementMemphisNewRequestService implements OnModuleInit {
  private readonly logger = new Logger(
    ReimbursementMemphisNewRequestService.name,
  );
  consumer: Consumer;
  producer: Producer;

  constructor(
    private configService: ConfigService,
    private memphisService: MemphisService,
    private readonly httpService: HttpService,
    @InjectKysely() private readonly pgsql: DB,
  ) {}

  async onModuleInit() {
    try {
      await this.memphisService.connect({
        host: this.configService.get<string>('MEMPHIS_HOST'),
        username: this.configService.get<string>('MEMPHIS_USERNAME'),
        password: this.configService.get<string>('MEMPHIS_PASSWORD'),
      });

      this.consumer = await this.memphisService.consumer({
        stationName: 'erp.finance-reimbursement-new-request',
        consumerName: 'erp.finance-reimbursement-new-request.consumer-name',
        consumerGroup: 'erp.finance-reimbursement-new-request.consumer-group',
      });

      this.consumer.on('message', async (message: Message) => {
        const data: Reimbursement = JSON.parse(
          message.getData().toString() || '{}',
        );

        const newRequest = await this.pgsql
          .selectFrom('finance_reimbursement_requests')
          .innerJoin(
            'finance_reimbursement_request_types',
            'finance_reimbursement_request_types.reimbursement_request_type_id',
            'finance_reimbursement_requests.reimbursement_request_type_id',
          )
          .innerJoin(
            'finance_reimbursement_expense_types',
            'finance_reimbursement_expense_types.expense_type_id',
            'finance_reimbursement_requests.expense_type_id',
          )
          .innerJoin(
            'finance_reimbursement_request_status',
            'finance_reimbursement_request_status.request_status_id',
            'finance_reimbursement_requests.request_status_id',
          )
          .innerJoin(
            'users',
            'users.user_id',
            'finance_reimbursement_requests.requestor_id',
          )
          .select([
            'finance_reimbursement_requests.reimbursement_request_id',
            'finance_reimbursement_requests.reference_no',
            'finance_reimbursement_request_types.reimbursement_request_type_id as request_type_id',
            'finance_reimbursement_request_types.request_type',
            'finance_reimbursement_expense_types.expense_type',
            'finance_reimbursement_request_status.request_status',
            'finance_reimbursement_requests.amount',
            'finance_reimbursement_requests.attachment',
            'finance_reimbursement_requests.date_approve',
            'finance_reimbursement_requests.dynamic_approvers',
            'users.user_id',
            'users.full_name',
            'users.email',
            'users.employee_id',
            'finance_reimbursement_requests.created_at',
          ])
          .where(
            'finance_reimbursement_requests.reimbursement_request_id',
            '=',
            data.reimbursement_request_id,
          )
          .executeTakeFirst();

        const refNoWithoutTheLetterAndHypen = newRequest.reference_no
          .match(/\d+-\d+/)[0]
          .split('-');

        await this.pgsql
          .updateTable('finance_reimbursement_requests')
          .set({
            text_search_properties: `${newRequest.full_name} ${
              newRequest.email
            } ${newRequest.employee_id} ${
              newRequest.reference_no
            } ${refNoWithoutTheLetterAndHypen.join(' ')} ${
              newRequest.request_type
            } ${newRequest.expense_type} ${newRequest.amount} ${
              newRequest.attachment
            }`,
          })
          .where(
            'reimbursement_request_id',
            '=',
            newRequest.reimbursement_request_id,
          )
          .execute();

        const requestor = await this.pgsql
          .selectFrom('users')
          .select(['users.hrbp_approver_email'])
          .where('user_id', '=', newRequest.user_id)
          .executeTakeFirst();

        if (!requestor.hrbp_approver_email) {
          await this.pgsql
            .updateTable('finance_reimbursement_requests')
            .set({
              no_hrbp_set: true,
            })
            .where(
              'reimbursement_request_id',
              '=',
              newRequest.reimbursement_request_id,
            )
            .execute();

          return message.ack();
        }

        if (newRequest.request_type_id === SCHEDULED_REQUEST) {
          const hrbp_in_users = await this.pgsql
            .selectFrom('users')
            .select([
              'users.user_id',
              'users.employee_id',
              'users.full_name',
              'users.email',
            ])
            .where('email', '=', requestor.hrbp_approver_email)
            .executeTakeFirst();

          const hrbp_in_approvers = await this.pgsql
            .selectFrom('finance_reimbursement_approvers')
            .select(['finance_reimbursement_approvers.approver_id'])
            .where('signatory_id', '=', hrbp_in_users.user_id)
            .executeTakeFirst();

          if (!hrbp_in_approvers) {
            this.logger.log(
              'HRBP is not an approver [approver_id]: ' +
                hrbp_in_approvers.approver_id,
            );

            return message.ack();
          }

          const randomBytes = crypto.randomBytes(16);
          const hexToken = randomBytes.toString('hex');

          const generatedLink = `${this.configService.get(
            'FRONT_END_URL',
          )}/sessionless-approval-link?token=${hexToken}`;

          await this.pgsql
            .insertInto('finance_reimbursement_approval_links')
            .values({
              reimbursement_request_id: newRequest.reimbursement_request_id,
              approval_link: generatedLink,
              token: hexToken,
              link_expired: false,
            })
            .execute();

          await this.pgsql
            .insertInto('finance_reimbursement_approval_matrix')
            .values([
              {
                reimbursement_request_id: newRequest.reimbursement_request_id,
                approver_id: hrbp_in_approvers.approver_id,
                approver_order: 1,
                approver_verifier: `${newRequest.reimbursement_request_id}<->1`,
              },
              {
                reimbursement_request_id: newRequest.reimbursement_request_id,
                approver_id: GROUP_APPROVER_PAYABLES,
                approver_order: 2,
                approver_verifier: `${newRequest.reimbursement_request_id}<->2`,
              },
              {
                reimbursement_request_id: newRequest.reimbursement_request_id,
                approver_id: GROUP_APPROVERS_TREASURY,
                approver_order: 3,
                approver_verifier: `${newRequest.reimbursement_request_id}<->3`,
              },
              {
                reimbursement_request_id: newRequest.reimbursement_request_id,
                approver_id: GROUP_APPROVERS_BILLING,
                approver_order: 4,
                approver_verifier: `${newRequest.reimbursement_request_id}<->4`,
              },
            ])
            .onConflict((oc) => oc.column('approver_verifier').doNothing())
            .execute();

          const sendEmailConfirmation = await firstValueFrom(
            this.httpService
              .post(
                '/api/email/confirmation',
                {
                  to: newRequest.email,
                  requestId: newRequest.reference_no,
                  hrbpManagerName:
                    hrbp_in_users?.full_name || hrbp_in_users.email,
                  fullName: hrbp_in_users?.full_name || hrbp_in_users.email,
                  employeeId: hrbp_in_users?.employee_id || hrbp_in_users.email,
                  expenseType: newRequest.expense_type,
                  expenseDate: newRequest.created_at,
                  amount: newRequest.amount,
                  receiptsAttached: newRequest.attachment,
                },
                {
                  baseURL: this.configService.get('FRONT_END_URL'),
                },
              )
              .pipe(
                catchError((error: AxiosError) => {
                  this.logger.error(error.response.data);

                  throw 'An error happened sending confirmation email!';
                }),
              ),
          );

          this.logger.log(sendEmailConfirmation);
        }

        if (newRequest.request_type_id === UNSCHEDULED_REQUEST) {
        }

        message.ack();
      });

      this.producer = await this.memphisService.producer({
        stationName: 'erp.finance-reimbursement-new-request',
        producerName: 'erp.finance-reimbursement-new-request.producer-name',
      });
    } catch (error: unknown) {
      this.logger.error(error);
      this.memphisService.close();
    }
  }
}

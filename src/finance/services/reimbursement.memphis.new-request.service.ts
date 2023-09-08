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
import { AxiosError } from 'axios';
import { catchError, firstValueFrom } from 'rxjs';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class ReimbursementMemphisNewRequestService implements OnModuleInit {
  private readonly logger = new Logger(
    ReimbursementMemphisNewRequestService.name,
  );

  consumer: Consumer;
  producer: Producer;

  constructor(
    private readonly configService: ConfigService,
    private readonly memphisService: MemphisService,
    private readonly httpService: HttpService,
    private readonly eventEmitter: EventEmitter2,
    @InjectKysely() private readonly pgsql: DB,
  ) {}

  @OnEvent('reimbursement-request-created')
  async test(data: Reimbursement) {
    return await this.producer.produce({
      message: Buffer.from(JSON.stringify(data)),
    });
  }

  async onModuleInit() {
    try {
      const frontEndUrl = this.configService.get('FRONT_END_URL');

      this.consumer = await this.memphisService.consumer({
        stationName: 'erp.finance-reimbursement-new-request',
        consumerName: 'erp.finance-reimbursement-new-request.consumer-name',
        consumerGroup: 'erp.finance-reimbursement-new-request.consumer-group',
      });

      this.consumer.on('message', async (message: Message) => {
        const data: Reimbursement = JSON.parse(
          message.getData().toString() || '{}',
        );

        const newRequest = data;

        this.logger.log('New request received:' + data.reference_no);

        if (newRequest?.dynamic_approvers?.length) {
          this.logger.log("Request has dynamic approvers, let's add them");
        }

        await this.pgsql
          .updateTable('finance_reimbursement_requests')
          .set({
            attachment_mask_name: `${
              newRequest?.full_name ? newRequest.full_name : 'no_name'
            }_${newRequest?.reference_no}`.toUpperCase(),
          })
          .where(
            'finance_reimbursement_requests.reimbursement_request_id',
            '=',
            data.reimbursement_request_id,
          )
          .execute();

        const refNoWithoutTheLetterAndHypen = newRequest.reference_no
          .match(/\d+-\d+/)[0]
          .split('-');

        await this.pgsql
          .updateTable('finance_reimbursement_requests')
          .set({
            text_search_properties: `${
              newRequest?.full_name ? newRequest.full_name : 'no_full_name'
            } ${newRequest.email} ${
              newRequest?.employee_id
                ? newRequest.employee_id
                : 'no_employee_id'
            } ${newRequest.reference_no} ${refNoWithoutTheLetterAndHypen.join(
              ' ',
            )} ${newRequest.request_type} ${newRequest.expense_type} ${
              newRequest.amount
            } ${newRequest.attachment}`,
          })
          .where(
            'reimbursement_request_id',
            '=',
            newRequest.reimbursement_request_id,
          )
          .execute();

        if (!newRequest.hrbp_approver_email) {
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
          const hrbpInUsers = await this.pgsql
            .selectFrom('users')
            .select([
              'users.user_id',
              'users.employee_id',
              'users.full_name',
              'users.email',
            ])
            .where('email', '=', newRequest.hrbp_approver_email)
            .executeTakeFirst();

          if (!hrbpInUsers) {
            this.logger.error('HRBP is not a user of the system');

            return message.ack();
          }

          const hrbpInApprovers = await this.pgsql
            .selectFrom('finance_reimbursement_approvers')
            .select(['finance_reimbursement_approvers.approver_id'])
            .where('signatory_id', '=', hrbpInUsers.user_id)
            .executeTakeFirst();

          if (!hrbpInApprovers) {
            this.logger.log('HRBP is not an approver');

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
                approver_id: hrbpInApprovers.approver_id,
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

          await firstValueFrom(
            this.httpService
              .post(
                '/api/email/confirmation',
                {
                  to: [newRequest.email],
                  requestId: newRequest.reference_no,
                  hrbpManagerName: newRequest?.full_name || 'No name set',
                  fullName: newRequest?.full_name || 'No name set',
                  employeeId: newRequest?.employee_id || 'No emp id set',
                  expenseType: newRequest.expense_type,
                  expenseDate: newRequest.created_at,
                  amount: newRequest.amount,
                  receiptsAttached: newRequest.attachment,
                },
                {
                  baseURL: frontEndUrl,
                },
              )
              .pipe(
                catchError((error: AxiosError) => {
                  this.logger.log(
                    'Failed to send confirmation email to requestor',
                  );

                  console.log(error?.response?.data);

                  message.ack();

                  throw Error('Failed to send confirmation email to requestor');
                }),
              ),
          );

          await firstValueFrom(
            this.httpService
              .post(
                '/api/email/hrbp-approval',
                {
                  to: [newRequest.hrbp_approver_email],
                  fullName: hrbpInUsers?.full_name || 'No name set',
                  employeeId: newRequest?.employee_id || 'No employee id set',
                  expenseType: newRequest.expense_type,
                  expenseDate: newRequest.created_at,
                  amount: newRequest.amount,
                  receiptsAttached: newRequest.attachment,
                },
                {
                  baseURL: frontEndUrl,
                },
              )
              .pipe(
                catchError((error: AxiosError) => {
                  this.logger.log(
                    'Failed to send confirmation email to requestor hrbp',
                  );

                  console.log(error?.response?.data);

                  message.ack();

                  throw Error(
                    'Failed to send confirmation email to requestor hrbp',
                  );
                }),
              ),
          );
        }

        if (newRequest.request_type_id === UNSCHEDULED_REQUEST) {
        }

        message.ack();
      });

      this.producer = await this.memphisService.producer({
        stationName: 'erp.finance-reimbursement-new-request',
        producerName: 'erp.finance-reimbursement-new-request.producer-name',
      });

      this.logger.log('Memphis reimbursement new request station is ready');
    } catch (error: any) {
      this.logger.error(error.message);
      this.memphisService.close();
    }
  }
}

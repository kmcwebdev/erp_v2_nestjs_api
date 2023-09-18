import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { catchError, firstValueFrom } from 'rxjs';
import { Consumer, MemphisService, Message, Producer } from 'memphis-dev';
import { InjectKysely } from 'nestjs-kysely';
import { DB } from 'src/common/types';
import { AxiosError } from 'axios';
import { SCHEDULED_REQUEST, UNSCHEDULED_REQUEST } from '../../common/constant';
import { ReimbursementRequest } from 'src/finance/common/interface/getOneRequest.interface';

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
    private readonly httpService: HttpService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @OnEvent('reimbursement-request-created')
  async triggerMemphisEvent(data: ReimbursementRequest) {
    return await this.producer.produce({
      message: Buffer.from(JSON.stringify(data)),
    });
  }

  async onModuleInit() {
    try {
      const frontEndUrl = this.configService.get('FRONT_END_URL');

      this.consumer = await this.memphisService.consumer({
        stationName: 'erp.reimbursement.new-request',
        consumerName: 'erp.reimbursement.new-request.consumer-name',
        consumerGroup: 'erp.reimbursement.new-request.consumer-group',
      });

      this.consumer.on('message', async (message: Message) => {
        const data: ReimbursementRequest = JSON.parse(
          message.getData().toString() || '{}',
        );

        const newRequest = data;

        await this.pgsql
          .updateTable('finance_reimbursement_requests')
          .set({
            attachment_mask_name: `${
              newRequest?.full_name
                ? newRequest.full_name.replace(' ', '_')
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
                approver_id: hrbp.approver_id,
                approver_order: 1,
                is_hrbp: true,
                approver_verifier: `${newRequest.reimbursement_request_id}<->1`,
              },
            ])
            .execute();

          const confirmationEmailData = {
            to: [newRequest.email],
            referenceNo: newRequest.reference_no,
            hrbpManagerName: hrbp?.full_name || 'No name set',
            fullName: newRequest?.full_name || 'No name set',
            employeeId: newRequest?.employee_id || 'No emp id set',
            expenseType: newRequest.expense_type,
            expenseDate: newRequest.created_at,
            amount: newRequest.amount,
            receiptsAttached: newRequest.attachment,
          };

          this.eventEmitter.emit(
            'reimbursement-request-send-email-hrbp-approval',
            confirmationEmailData,
          );

          const hrbpApprovalEmailData = {
            to: [newRequest.hrbp_approver_email],
            approverFullName: hrbp.full_name || 'HRBP',
            fullName: newRequest?.full_name || 'No name set',
            employeeId: newRequest?.employee_id || 'No employee id set',
            expenseType: newRequest.expense_type,
            expenseDate: newRequest.created_at,
            amount: newRequest.amount,
            receiptsAttached: newRequest.attachment,
          };

          this.eventEmitter.emit(
            'reimbursement-request-send-hrbp-approval-email',
            hrbpApprovalEmailData,
          );

          await firstValueFrom(
            this.httpService
              .post('/api/email/hrbp-approval', hrbpApprovalEmailData, {
                baseURL: frontEndUrl,
              })
              .pipe(
                catchError((error: AxiosError) => {
                  this.logger.log(
                    '[memphis_new_request]: Failed to send confirmation email to requestor hrbp',
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
          if (newRequest?.dynamic_approvers) {
            const approvers = newRequest.dynamic_approvers.split(',');

            // TODO: Check if all of the entries in approvers array is a valid email address

            approvers.forEach(async (ap) => {
              console.log(ap);
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
      this.memphisService.close();
    }
  }
}

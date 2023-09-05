import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Consumer, MemphisService, Message, Producer } from 'memphis-dev';
import { Reimbursement } from '../common/interface/reimbursement.interface';
import { InjectKysely } from 'nestjs-kysely';
import { DB } from 'src/common/types';

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
            'finance_reimbursement_request_types.request_type',
            'finance_reimbursement_expense_types.expense_type',
            'finance_reimbursement_request_status.request_status',
            'finance_reimbursement_requests.amount',
            'finance_reimbursement_requests.attachment',
            'users.full_name',
            'users.email',
            'users.employee_id',
            'finance_reimbursement_requests.date_approve',
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

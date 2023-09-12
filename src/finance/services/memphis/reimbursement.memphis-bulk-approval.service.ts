import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Consumer, MemphisService, Message, Producer } from 'memphis-dev';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { InjectKysely } from 'nestjs-kysely';
import { DB } from 'src/common/types';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { RequestUser } from 'src/auth/common/interface/propelauthUser.interface';
import { ReimbursementRequest } from '../../common/interface/getOneRequest.interface';
import { ReimbursementGetOneService } from '../reimbursement.get-one.service';

type MyUnionType = ReimbursementRequest | { message: string };

@Injectable()
export class ReimbursementMemphisBulkApprovalService implements OnModuleInit {
  private readonly logger = new Logger(
    ReimbursementMemphisBulkApprovalService.name,
  );

  consumer: Consumer;
  producer: Producer;

  constructor(
    private readonly reimbursementGetOneService: ReimbursementGetOneService,
    private readonly configService: ConfigService,
    private readonly memphisService: MemphisService,
    private readonly httpService: HttpService,
    private readonly eventEmitter: EventEmitter2,
    @InjectKysely() private readonly pgsql: DB,
  ) {}

  async approveRequest(
    user: RequestUser,
    approval_matrix_id: string,
  ): Promise<MyUnionType> {
    const approveReimbursementRequest = await this.pgsql
      .transaction()
      .execute(async (trx) => {
        const updatedReimbursementMatrix = await trx
          .updateTable('finance_reimbursement_approval_matrix')
          .set({
            has_approved: true,
            performed_by_user_id: user.original_user_id,
            updated_at: new Date(),
          })
          .leftJoin(
            'finance_reimbursement_requests',
            'reimbursement_request_id',
            'reimbursement_request_id',
          )
          .returning([
            'finance_reimbursement_approval_matrix.reimbursement_request_id',
          ])
          .where('finance_reimbursement_requests.is_cancelled', '=', false)
          .where('finance_reimbursement_requests.is_onhold', '=', false)
          .where('finance_reimbursement_requests.date_approve', 'is', null)
          .where(
            'finance_reimbursement_approval_matrix.approval_matrix_id',
            '=',
            approval_matrix_id,
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
          .executeTakeFirst();

        if (!updatedReimbursementMatrix) {
          return {
            message: 'This request is already approved',
          };
        }

        const matrix = await trx
          .selectFrom('finance_reimbursement_approval_matrix')
          .select([
            'finance_reimbursement_approval_matrix.approval_matrix_id',
            'finance_reimbursement_approval_matrix.reimbursement_request_id',
            'finance_reimbursement_approval_matrix.approver_order',
          ])
          .where(
            'finance_reimbursement_approval_matrix.reimbursement_request_id',
            '=',
            updatedReimbursementMatrix.reimbursement_request_id,
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
          .orderBy(
            'finance_reimbursement_approval_matrix.approver_order',
            'asc',
          )
          .executeTakeFirst();

        if (matrix) {
          await this.pgsql
            .updateTable('finance_reimbursement_requests')
            .set({
              next_approver_order: matrix.approver_order,
            })
            .where(
              'finance_reimbursement_requests.reimbursement_request_id',
              '=',
              updatedReimbursementMatrix.reimbursement_request_id,
            )
            .execute();

          this.logger.log('Sending email to next approver');
        }

        const reimbursement = await this.reimbursementGetOneService.get({
          reimbursement_request_id:
            updatedReimbursementMatrix.reimbursement_request_id,
        });

        return reimbursement;
      });

    return approveReimbursementRequest;
  }

  @OnEvent('reimbursement-request-bulk-approval')
  async test(data: { user: RequestUser; matrixIds: string[] }) {
    return await this.producer.produce({
      message: Buffer.from(JSON.stringify(data)),
    });
  }

  async onModuleInit() {
    try {
      const frontEndUrl = this.configService.get('FRONT_END_URL');

      this.consumer = await this.memphisService.consumer({
        stationName: 'erp.finance-reimbursement-request-bulk-approval',
        consumerName:
          'erp.finance-reimbursement-request-bulk-approval.consumer-name',
        consumerGroup:
          'erp.finance-reimbursement-request-bulk-approval.consumer-group',
      });

      this.consumer.on('message', async (message: Message) => {
        const data: { user: RequestUser; matrixIds: string[] } = JSON.parse(
          message.getData().toString() || '{}',
        );

        const promises = data.matrixIds.map(async (matrixId) => {
          const approved = await this.approveRequest(data.user, matrixId);

          return approved;
        });

        Promise.all(promises)
          .then((logMessages) => {
            logMessages.forEach((message) =>
              this.logger.log(JSON.stringify(message)),
            );
          })
          .catch((error) => {
            this.logger.error('An error occurred:', error);
          });

        message.ack();
      });

      this.producer = await this.memphisService.producer({
        stationName: 'erp.finance-reimbursement-request-bulk-approval',
        producerName:
          'erp.finance-reimbursement-request-bulk-approval.producer-name',
      });

      this.logger.log('Memphis reimbursement bulk approval station is ready');
    } catch (error: any) {
      this.logger.error(error.message);
      this.memphisService.close();
    }
  }
}

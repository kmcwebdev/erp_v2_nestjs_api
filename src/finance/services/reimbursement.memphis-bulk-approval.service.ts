import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Consumer, MemphisService, Message, Producer } from 'memphis-dev';
import { InjectKysely } from 'nestjs-kysely';
import { DB } from 'src/common/types';
import { HttpService } from '@nestjs/axios';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { RequestUser } from 'src/auth/common/interface/propelauthUser.interface';
import { ReimbursementApiService } from './reimbursement.api.service';
import { ReimbursementRequest } from '../common/interface/getOneRequest.interface';

type MyUnionType = ReimbursementRequest | { message: string };

@Injectable()
export class ReimbursementMemphisBulkApprovalService implements OnModuleInit {
  private readonly logger = new Logger(
    ReimbursementMemphisBulkApprovalService.name,
  );

  consumer: Consumer;
  producer: Producer;

  constructor(
    private readonly reimbursementApiService: ReimbursementApiService,
    private readonly configService: ConfigService,
    private readonly memphisService: MemphisService,
    private readonly httpService: HttpService,
    private readonly eventEmitter: EventEmitter2,
    @InjectKysely() private readonly pgsql: DB,
  ) {}

  async approveRequest(
    user: RequestUser,
    matrixId: string,
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
          .returning([
            'finance_reimbursement_approval_matrix.reimbursement_request_id',
          ])
          .where(
            'finance_reimbursement_approval_matrix.approval_matrix_id',
            '=',
            matrixId,
          )
          .where(
            'finance_reimbursement_approval_matrix.has_approved',
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
            'finance_reimbursement_approval_matrix.approver_id',
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

        const reimbursement =
          await this.reimbursementApiService.getOneReimbursementRequest({
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

        data.matrixIds.forEach(async (matrixId) => {
          const approved = await this.approveRequest(data.user, matrixId);

          this.logger.log(
            'Request id approved: ' + approved &&
              'reimbursement_request_id' in approved
              ? approved.reimbursement_request_id
              : 'message' in approved
              ? approved.message
              : 'Somethings not right.',
          );
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

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Consumer, MemphisService, Message, Producer } from 'memphis-dev';
import { OnEvent } from '@nestjs/event-emitter';
import { RequestUser } from 'src/auth/common/interface/propelauthUser.interface';
import { ReimbursementApproveService } from '../reimbursement.approve.service';

@Injectable()
export class ReimbursementMemphisBulkApprovalService implements OnModuleInit {
  private readonly logger = new Logger(
    ReimbursementMemphisBulkApprovalService.name,
  );

  consumer: Consumer;
  producer: Producer;

  constructor(
    private readonly reimbursementApproveService: ReimbursementApproveService,
    private readonly memphisService: MemphisService,
  ) {}

  @OnEvent('reimbursement-request-bulk-approval')
  async test(data: { user: RequestUser; matrixIds: string[] }) {
    return await this.producer.produce({
      message: Buffer.from(JSON.stringify(data)),
    });
  }

  async onModuleInit() {
    try {
      this.consumer = await this.memphisService.consumer({
        stationName: 'erp.reimbursement.bulk-approval',
        consumerName: 'erp.reimbursement.bulk-approval.consumer-name',
        consumerGroup: 'erp.reimbursement.bulk-approval.consumer-group',
      });

      this.producer = await this.memphisService.producer({
        stationName: 'erp.reimbursement.bulk-approval',
        producerName: 'erp.reimbursement.bulk-approval.producer-name',
      });

      this.consumer.on('message', async (message: Message) => {
        const data: { user: RequestUser; matrixIds: string[] } = JSON.parse(
          message.getData().toString(),
        );

        const promises = data.matrixIds.map(async (matrixId) => {
          const approvedReimbursementRequest =
            await this.reimbursementApproveService.approveReimbursementRequest(
              data.user,
              matrixId,
            );

          return approvedReimbursementRequest;
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

      this.logger.log(
        'Memphis reimbursement bulk approval station is ready 🤙 🚀',
      );
    } catch (error: any) {
      this.logger.error(error.message);
    }
  }
}

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Consumer, MemphisService, Message, Producer } from 'memphis-dev';
import { InjectKysely } from 'nestjs-kysely';
import { DB } from 'src/common/types';
import { RequestUser } from 'src/auth/common/interface/propelauthUser.interface';
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class ReimbursementMemphisEmailHrbpApprovalService
  implements OnModuleInit
{
  private readonly logger = new Logger(
    ReimbursementMemphisEmailHrbpApprovalService.name,
  );

  consumer: Consumer;
  producer: Producer;

  constructor(
    @InjectKysely() private readonly pgsql: DB,
    private readonly memphisService: MemphisService,
  ) {}

  @OnEvent('reimbursement-request-send-email-hrbp-approval')
  async triggerMemphisEvent(data: any) {
    return await this.producer.produce({
      message: Buffer.from(JSON.stringify(data)),
    });
  }

  async onModuleInit() {
    try {
      this.consumer = await this.memphisService.consumer({
        stationName: 'erp.reimbursement.email-hrbp-approval',
        consumerName: 'erp.reimbursement.email-hrbp-approval.consumer-name',
        consumerGroup: 'erp.reimbursement.email-hrbp-approva.consumer-group',
      });

      this.consumer.on('message', async (message: Message) => {
        const data: RequestUser = JSON.parse(
          message.getData().toString() || '{}',
        );

        console.log(data);

        message.ack();
      });

      this.producer = await this.memphisService.producer({
        stationName: 'erp.reimbursement.email-hrbp-approva',
        producerName: 'erp.reimbursement.email-hrbp-approva.producer-name',
      });

      this.logger.log(
        'Memphis reimbursement request email hrbp approval station is ready 📧 🚀',
      );
    } catch (error: unknown) {
      this.logger.error(error);
      this.memphisService.close();
    }
  }
}

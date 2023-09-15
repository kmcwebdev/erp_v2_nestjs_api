import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Consumer, MemphisService, Message, Producer } from 'memphis-dev';
import { InjectKysely } from 'nestjs-kysely';
import { DB } from 'src/common/types';
import { RequestUser } from 'src/auth/common/interface/propelauthUser.interface';

@Injectable()
export class ReimbursementMemphisEmailConfirmationService
  implements OnModuleInit
{
  private readonly logger = new Logger(
    ReimbursementMemphisEmailConfirmationService.name,
  );

  consumer: Consumer;
  producer: Producer;

  constructor(
    @InjectKysely() private readonly pgsql: DB,
    private readonly memphisService: MemphisService,
  ) {}

  async onModuleInit() {
    try {
      this.consumer = await this.memphisService.consumer({
        stationName: 'erp.reimbursement.email-confirmation',
        consumerName: 'erp.reimbursement.email-confirmation.consumer-name',
        consumerGroup: 'erp.reimbursement.email-confirmation.consumer-group',
      });

      this.consumer.on('message', async (message: Message) => {
        const data: RequestUser = JSON.parse(
          message.getData().toString() || '{}',
        );

        console.log(data);

        message.ack();
      });

      this.producer = await this.memphisService.producer({
        stationName: 'erp.reimbursement.email-confirmation',
        producerName: 'erp.reimbursement.email-confirmation.producer-name',
      });

      this.logger.log(
        'Memphis reimbursement request email confirmation station is ready',
      );
    } catch (error: unknown) {
      this.logger.error(error);
      this.memphisService.close();
    }
  }
}

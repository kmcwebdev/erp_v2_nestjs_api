import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Consumer, MemphisService, Message, Producer } from 'memphis-dev';
import { InjectKysely } from 'nestjs-kysely';
import { DB } from 'src/common/types';
import { RequestUser } from 'src/auth/common/interface/propelauthUser.interface';

@Injectable()
export class UpdateUserMemphisService implements OnModuleInit {
  private readonly logger = new Logger(UpdateUserMemphisService.name);

  consumer: Consumer;
  producer: Producer;

  constructor(
    @InjectKysely() private readonly pgsql: DB,
    private readonly memphisService: MemphisService,
  ) {}

  async onModuleInit() {
    try {
      this.consumer = await this.memphisService.consumer({
        stationName: 'erp.reimbursement.update-user',
        consumerName: 'erp.reimbursement.update-user.consumer-name',
        consumerGroup: 'erp.reimbursement.update-user.consumer-group',
      });

      this.consumer.on('message', async (message: Message) => {
        const data: RequestUser = JSON.parse(
          message.getData().toString() || '{}',
        );

        console.log(data);

        message.ack();
      });

      this.producer = await this.memphisService.producer({
        stationName: 'erp.reimbursement.update-user',
        producerName: 'erp.reimbursement.update-user.producer-name',
      });

      this.logger.log('Memphis user update station is ready 👨‍👨‍👦‍👦 🚀');
    } catch (error: unknown) {
      this.logger.error(error);
    }
  }
}

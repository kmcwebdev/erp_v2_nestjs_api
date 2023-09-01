import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Consumer, MemphisService, Message, Producer } from 'memphis-dev';
import { Reimbursement } from '../common/interface/reimbursement.interface';

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

        console.log(data);

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

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Consumer, MemphisService, Producer } from 'memphis-dev';

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

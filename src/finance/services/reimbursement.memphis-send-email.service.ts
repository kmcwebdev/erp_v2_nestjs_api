import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Consumer, MemphisService, Producer } from 'memphis-dev';

@Injectable()
export class ReimbursementMemphisSendEmailService implements OnModuleInit {
  private readonly logger = new Logger(
    ReimbursementMemphisSendEmailService.name,
  );

  consumer: Consumer;
  producer: Producer;

  constructor(private memphisService: MemphisService) {}

  async onModuleInit() {
    try {
      this.consumer = await this.memphisService.consumer({
        stationName: 'erp.finance-reimbursement-send-email',
        consumerName: 'erp.finance-reimbursement-send-email.consumer-name',
        consumerGroup: 'erp.finance-reimbursement-send-email.consumer-group',
      });

      this.producer = await this.memphisService.producer({
        stationName: 'erp.finance-reimbursement-send-email',
        producerName: 'erp.finance-reimbursement-send-email.producer-name',
      });
    } catch (error: unknown) {
      this.logger.error(error);
      this.memphisService.close();
    }
  }
}

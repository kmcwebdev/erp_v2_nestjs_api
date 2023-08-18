import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Consumer, MemphisService, Producer } from 'memphis-dev';

@Injectable()
export class ReimbursementMemphisEmailService implements OnModuleInit {
  private readonly logger = new Logger(ReimbursementMemphisEmailService.name);
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

      this.producer = await this.memphisService.producer({
        stationName: 'finance.reimbursement.email',
        producerName: 'finance.reimbursement.email.producer-name',
      });

      this.consumer = await this.memphisService.consumer({
        stationName: 'finance.reimbursement.email',
        consumerName: 'finance.reimbursement.email.consumer-name',
        consumerGroup: 'finance.reimbursement.email.consumer-group',
      });
    } catch (error: unknown) {
      this.logger.error(error);
      this.memphisService.close();
    }
  }
}

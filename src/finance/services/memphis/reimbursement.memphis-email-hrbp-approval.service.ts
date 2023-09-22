import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Consumer, MemphisService, Message, Producer } from 'memphis-dev';
import { OnEvent } from '@nestjs/event-emitter';
import { HttpService } from '@nestjs/axios';
import { catchError, firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import { ConfigService } from '@nestjs/config';
import { HrbpApprovalEmailType } from 'src/finance/common/zod-schema/hrbp-approval-email.schema';

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
    private readonly configService: ConfigService,
    private readonly memphisService: MemphisService,
    private readonly httpService: HttpService,
  ) {}

  @OnEvent('reimbursement-request-send-email-hrbp-approval')
  async triggerMemphisEvent(data: HrbpApprovalEmailType) {
    return await this.producer.produce({
      message: Buffer.from(JSON.stringify(data)),
    });
  }

  async onModuleInit() {
    try {
      this.consumer = await this.memphisService.consumer({
        stationName: 'erp.reimbursement.email-hrbp-approval',
        consumerName: 'erp.reimbursement.email-hrbp-approval.consumer-name',
        consumerGroup: 'erp.reimbursement.email-hrbp-approval.consumer-group',
      });

      this.producer = await this.memphisService.producer({
        stationName: 'erp.reimbursement.email-hrbp-approval',
        producerName: 'erp.reimbursement.email-hrbp-approval.producer-name',
      });

      this.consumer.on('message', async (message: Message) => {
        const data: HrbpApprovalEmailType = JSON.parse(
          message.getData().toString(),
        );

        await firstValueFrom(
          this.httpService
            .post('/api/email/hrbp-approval', data, {
              baseURL: this.configService.get('FRONT_END_URL'),
            })
            .pipe(
              catchError((error: AxiosError) => {
                this.logger.log(
                  '[memphis_new_request]: Failed to send approval email to hrbp',
                );

                console.log(error?.response?.data);

                throw Error('Failed to send approval email to hrbp');
              }),
            ),
        );

        message.ack();
      });

      this.logger.log(
        'Memphis reimbursement request email hrbp approval station is ready 📧 🚀',
      );
    } catch (error: unknown) {
      this.logger.error(error);
    }
  }
}

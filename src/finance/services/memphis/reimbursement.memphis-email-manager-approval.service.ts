import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Consumer, MemphisService, Message, Producer } from 'memphis-dev';
import { OnEvent } from '@nestjs/event-emitter';
import { HttpService } from '@nestjs/axios';
import { catchError, firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import { ConfigService } from '@nestjs/config';
import { ManagerApprovalEmailType } from 'src/finance/common/zod-schema/manager-approval-email.schema';

@Injectable()
export class ReimbursementMemphisEmailManagerApprovalService
  implements OnModuleInit
{
  private readonly logger = new Logger(
    ReimbursementMemphisEmailManagerApprovalService.name,
  );

  consumer: Consumer;
  producer: Producer;

  constructor(
    private readonly configService: ConfigService,
    private readonly memphisService: MemphisService,
    private readonly httpService: HttpService,
  ) {}

  @OnEvent('reimbursement-request-send-email-manager-approval')
  async triggerMemphisEvent(data: ManagerApprovalEmailType) {
    return await this.producer.produce({
      message: Buffer.from(JSON.stringify(data)),
    });
  }

  async onModuleInit() {
    try {
      this.consumer = await this.memphisService.consumer({
        stationName: 'erp.reimbursement.email-manager-approval',
        consumerName: 'erp.reimbursement.email-manager-approval.consumer-name',
        consumerGroup:
          'erp.reimbursement.email-manager-approval.consumer-group',
      });

      this.consumer.on('message', async (message: Message) => {
        const data: ManagerApprovalEmailType = JSON.parse(
          message.getData().toString(),
        );

        await firstValueFrom(
          this.httpService
            .post('/api/email/manager-approval', data, {
              baseURL: this.configService.get('FRONT_END_URL'),
            })
            .pipe(
              catchError((error: AxiosError) => {
                this.logger.log(
                  '[memphis_new_request]: Failed to send approval email to manager',
                );

                console.log(error?.response?.data);

                throw Error('Failed to send approval email to manager');
              }),
            ),
        ).finally(() => message.ack());
      });

      this.producer = await this.memphisService.producer({
        stationName: 'erp.reimbursement.email-manager-approval',
        producerName: 'erp.reimbursement.email-manager-approval.producer-name',
      });

      this.logger.log(
        'Memphis reimbursement request email manager approval station is ready 📧 🚀',
      );
    } catch (error: unknown) {
      this.logger.error(error);
    }
  }
}

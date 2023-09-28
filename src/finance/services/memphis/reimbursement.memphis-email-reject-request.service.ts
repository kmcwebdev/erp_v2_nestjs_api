import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Consumer, MemphisService, Message, Producer } from 'memphis-dev';
import { OnEvent } from '@nestjs/event-emitter';
import { AxiosError } from 'axios';
import { HttpService } from '@nestjs/axios';
import { catchError, firstValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import {
  RejectRequestEmailSchema,
  RejectRequestEmailType,
} from 'src/finance/common/zod-schema/reject-request-email.schema';

@Injectable()
export class ReimbursementMemphisEmailRejectRequestService
  implements OnModuleInit
{
  private readonly logger = new Logger(
    ReimbursementMemphisEmailRejectRequestService.name,
  );

  consumer: Consumer;
  producer: Producer;

  constructor(
    private readonly configService: ConfigService,
    private readonly memphisService: MemphisService,
    private readonly httpService: HttpService,
  ) {}

  @OnEvent('reimbursement-request-send-email-confirmation')
  async triggerMemphisEvent(data: RejectRequestEmailType) {
    const parsed = await RejectRequestEmailSchema.safeParseAsync(data);

    if (parsed.success === false) {
      console.log(parsed.error.message);
    }

    return await this.producer.produce({
      message: Buffer.from(JSON.stringify(data)),
    });
  }

  async onModuleInit() {
    try {
      this.consumer = await this.memphisService.consumer({
        stationName: 'erp.reimbursement.email-rejection',
        consumerName: 'erp.reimbursement.email-rejection.consumer-name',
        consumerGroup: 'erp.reimbursement.email-rejection.consumer-group',
      });

      this.consumer.on('message', async (message: Message) => {
        const data: RejectRequestEmailType = JSON.parse(
          message.getData().toString(),
        );

        await firstValueFrom(
          this.httpService
            .post('/api/email/reimbursement-rejected', data, {
              baseURL: this.configService.get('FRONT_END_URL'),
            })
            .pipe(
              catchError((error: AxiosError) => {
                this.logger.log(
                  '[memphis_new_request]: Failed to send rejection email to requestor',
                );

                this.logger.error(error?.response?.data);

                throw Error('Failed to send rejection email to requestor');
              }),
            ),
        ).finally(() => message.ack());
      });

      this.producer = await this.memphisService.producer({
        stationName: 'erp.reimbursement.email-rejection',
        producerName: 'erp.reimbursement.email-rejection.producer-name',
      });

      this.logger.log(
        'Memphis reimbursement request email rejection station is ready 📧 🚀',
      );
    } catch (error: unknown) {
      this.logger.error(error);
    }
  }
}

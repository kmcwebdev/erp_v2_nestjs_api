import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Consumer, MemphisService, Message, Producer } from 'memphis-dev';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { AxiosError } from 'axios';
import { HttpService } from '@nestjs/axios';
import { catchError, firstValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import {
  ConfirmationEmailSchema,
  ConfirmationEmailType,
} from 'src/finance/common/zod-schema/confirmation-email.schema';

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
    private readonly configService: ConfigService,
    private readonly memphisService: MemphisService,
    private readonly httpService: HttpService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @OnEvent('reimbursement-request-send-email-confirmation')
  async triggerMemphisEvent(data: ConfirmationEmailType) {
    const validate = await ConfirmationEmailSchema.safeParseAsync(data);

    if (!validate.success) {
      return this.eventEmitter.emit(
        'reimbursement-request-send-email-confirmation-error',
        '[memphis-email-confirmation]: Schema error in request confirmation email',
      );
    }

    return await this.producer.produce({
      message: Buffer.from(JSON.stringify(data)),
    });
  }

  async onModuleInit() {
    try {
      this.consumer = await this.memphisService.consumer({
        stationName: 'erp.reimbursement.email-confirmation',
        consumerName: 'erp.reimbursement.email-confirmation.consumer-name',
        consumerGroup: 'erp.reimbursement.email-confirmation.consumer-group',
      });

      this.producer = await this.memphisService.producer({
        stationName: 'erp.reimbursement.email-confirmation',
        producerName: 'erp.reimbursement.email-confirmation.producer-name',
      });

      this.consumer.on('message', async (message: Message) => {
        const data: ConfirmationEmailType = JSON.parse(
          message.getData().toString(),
        );

        await firstValueFrom(
          this.httpService
            .post('/api/email/confirmation', data, {
              baseURL: this.configService.get('FRONT_END_URL'),
            })
            .pipe(
              catchError((error: AxiosError) => {
                this.logger.log(
                  '[memphis_new_request]: Failed to send confirmation email to requestor',
                );

                this.logger.error(error?.response?.data);

                throw Error('Failed to send confirmation email to requestor');
              }),
            ),
        );

        message.ack();
      });

      this.logger.log(
        'Memphis reimbursement request email confirmation station is ready 📧 🚀',
      );
    } catch (error: unknown) {
      this.logger.error(error);
    }
  }
}

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Consumer, MemphisService, Message, Producer } from 'memphis-dev';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { OnEvent } from '@nestjs/event-emitter';
import { NewUserEmailType } from 'src/finance/common/zod-schema/new-user-email.schema';
import { catchError, firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

@Injectable()
export class ReimbursementMemphisEmailNewUserService implements OnModuleInit {
  private readonly logger = new Logger(
    ReimbursementMemphisEmailNewUserService.name,
  );

  consumer: Consumer;
  producer: Producer;

  constructor(
    private readonly configService: ConfigService,
    private readonly memphisService: MemphisService,
    private readonly httpService: HttpService,
  ) {}

  @OnEvent('reimbursement-request-send-email-new-user')
  async triggerMemphisEvent(data: NewUserEmailType) {
    return await this.producer.produce({
      message: Buffer.from(JSON.stringify(data)),
    });
  }

  async onModuleInit() {
    try {
      this.consumer = await this.memphisService.consumer({
        stationName: 'erp.reimbursement.email-new-user',
        consumerName: 'erp.reimbursement.email-new-user.consumer-name',
        consumerGroup: 'erp.reimbursement.email-new-user.consumer-group',
      });

      this.consumer.on('message', async (message: Message) => {
        const data: NewUserEmailType = JSON.parse(message.getData().toString());

        await firstValueFrom(
          this.httpService
            .post('/api/email/new-user', data, {
              baseURL: this.configService.get('FRONT_END_URL'),
            })
            .pipe(
              catchError((error: AxiosError) => {
                this.logger.log(
                  '[memphis_new_request]: Failed to send new user email',
                );

                this.logger.error(error?.response?.data);

                throw Error('Failed to send new user email');
              }),
            ),
        ).finally(() => message.ack());

        console.log('[new-user]: Message acknowledge triggered');
        message.ack();
      });

      this.producer = await this.memphisService.producer({
        stationName: 'erp.reimbursement.email-new-user',
        producerName: 'erp.reimbursement.email-new-user.producer-name',
      });

      this.logger.log('Memphis new user email station is ready 📧 🚀');
    } catch (error: unknown) {
      this.logger.error(error);
    }
  }
}

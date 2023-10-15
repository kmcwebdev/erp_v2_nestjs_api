import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Consumer, MemphisService, Message, Producer } from 'memphis-dev';
import { OnEvent } from '@nestjs/event-emitter';
import { AxiosError } from 'axios';
import { HttpService } from '@nestjs/axios';
import { catchError, firstValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import {
  ApproveRequestEmailSchema,
  ApproveRequestEmailType,
} from 'src/finance/common/zod-schema/approve-email.schema';

@Injectable()
export class ReimbursementMemphisEmailApproveService implements OnModuleInit {
  private readonly logger = new Logger(
    ReimbursementMemphisEmailApproveService.name,
  );

  consumer: Consumer;
  producer: Producer;

  constructor(
    private readonly configService: ConfigService,
    private readonly memphisService: MemphisService,
    private readonly httpService: HttpService,
  ) {}

  @OnEvent('reimbursement-request-send-email-approve-request')
  async triggerMemphisEvent(data: ApproveRequestEmailType) {
    const parsed = await ApproveRequestEmailSchema.safeParseAsync(data);

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
        stationName: 'erp.reimbursement.email-approve-request',
        consumerName: 'erp.reimbursement.email-approve-request.consumer-name',
        consumerGroup: 'erp.reimbursement.email-approve-request.consumer-group',
      });

      this.consumer.on('message', async (message: Message) => {
        const data: ApproveRequestEmailType = JSON.parse(
          message.getData().toString(),
        );

        console.log('ReimbursementMemphisEmailApproveService payload', data);

        await firstValueFrom(
          this.httpService
            .post('/api/email/reimbursement-approved', data, {
              baseURL: this.configService.get('FRONT_END_URL'),
            })
            .pipe(
              catchError((error: AxiosError) => {
                this.logger.log(
                  '[memphis_new_request]: Failed to send approve email notification to requestor',
                );

                this.logger.error(error?.response?.data);

                throw Error(
                  'Failed to send approve email notification to requestor',
                );
              }),
            ),
        ).finally(() => message.ack());
      });

      this.producer = await this.memphisService.producer({
        stationName: 'erp.reimbursement.email-approve-request',
        producerName: 'erp.reimbursement.email-approve-request.producer-name',
      });

      this.logger.log(
        'Memphis reimbursement request approve email notification station is ready 📧 🚀',
      );
    } catch (error: unknown) {
      this.logger.error(error);
    }
  }
}

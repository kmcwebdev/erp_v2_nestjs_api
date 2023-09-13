import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Consumer, MemphisService, Message, Producer } from 'memphis-dev';
import { CdcRequestEnvelope } from './common/interface/requestEnvelope.interface';
import { USERS_TABLE } from 'src/users/common/constant';
import { FINANCE_REIMBURSEMENT_REQUESTS_TABLE } from './common/constant';
import { Reimbursement } from 'src/finance/common/interface/reimbursement.interface';
import { RequestUser } from 'src/auth/common/interface/propelauthUser.interface';

@Injectable()
export class MemphisCdcService implements OnModuleInit {
  private readonly logger = new Logger(MemphisCdcService.name);
  consumer: Consumer;
  producer: Producer;

  constructor(private readonly memphisService: MemphisService) {}

  async onModuleInit(): Promise<void> {
    try {
      this.consumer = await this.memphisService.consumer({
        stationName: 'erp.cdc-events',
        consumerName: 'erp.cdc-events.consumer',
        consumerGroup: 'erp.cdc-events.consumer-group',
      });

      this.consumer.on('message', async (message: Message) => {
        const data: CdcRequestEnvelope = JSON.parse(
          message.getData().toString() || '{}',
        );

        const { source, before, after } = data.payload;
        const { table } = source;

        // New user created
        if (table === USERS_TABLE && before === null) {
          const newUser = after as RequestUser;

          console.log(JSON.stringify(Object.assign(newUser, { new: true })));
        }

        // User updated
        if (table === USERS_TABLE && before !== null && after !== null) {
          const updatedUser = after as RequestUser;

          console.log(
            JSON.stringify(Object.assign(updatedUser, { updated: true })),
          );
        }

        // User deleted
        if (table === USERS_TABLE && after === null) {
          const deletedUser = before as RequestUser;

          console.log(Object.assign(deletedUser, { deleted: true }));
        }

        if (table === FINANCE_REIMBURSEMENT_REQUESTS_TABLE && before === null) {
          const newReimbursementRequest = after as Reimbursement;

          console.log(Object.assign(newReimbursementRequest, { new: true }));
        }

        if (table === FINANCE_REIMBURSEMENT_REQUESTS_TABLE && after === null) {
          const deletedReimbursementRequest = before as Reimbursement;

          console.log(
            Object.assign(deletedReimbursementRequest, { deleted: true }),
          );
        }

        message.ack();
      });

      this.producer = await this.memphisService.producer({
        stationName: 'erp.cdc-events',
        producerName: 'erp.cdc-events.producer-name',
      });

      this.logger.log('Memphis cdc station is ready');
    } catch (error: unknown) {
      this.logger.error(error);
      this.memphisService.close();
    }
  }
}

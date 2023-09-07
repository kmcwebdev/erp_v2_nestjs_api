import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Consumer, MemphisService, Message, Producer } from 'memphis-dev';
import { CdcRequestEnvelope } from './common/interface/requestEnvelope.interface';
import { USERS_TABLE } from 'src/users/common/constant';
import { User } from 'src/users/common/interface/user.interface';
import { FINANCE_REIMBURSEMENT_REQUESTS_TABLE } from './common/constant';
import { Reimbursement } from 'src/finance/common/interface/reimbursement.interface';
import { NewUserMemphisService } from 'src/users/services/new-user.memphis.service';
import { UpdateUserMemphisService } from 'src/users/services/update-user.memphis.service';
import { ReimbursementMemphisNewRequestService } from 'src/finance/services/reimbursement.memphis.new-request.service';

@Injectable()
export class MemphisCdcService implements OnModuleInit {
  private readonly logger = new Logger(MemphisCdcService.name);
  consumer: Consumer;
  producer: Producer;

  constructor(
    private readonly memphisService: MemphisService,
    private readonly newUserMemphisService: NewUserMemphisService,
    private readonly updateUserMemphisService: UpdateUserMemphisService,
    private readonly reimbursementMemphisNewRequestService: ReimbursementMemphisNewRequestService,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      this.producer = await this.memphisService.producer({
        stationName: 'erp.cdc-events',
        producerName: 'erp.cdc-events.producer-name',
      });

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
          const newUser = after as User;

          await this.newUserMemphisService.producer.produce({
            message: Buffer.from(JSON.stringify(newUser)),
          });
        }

        // User updated
        if (table === USERS_TABLE && before !== null && after !== null) {
          const updatedUser = after as User;

          await this.updateUserMemphisService.producer.produce({
            message: Buffer.from(JSON.stringify(updatedUser)),
          });
        }

        // User deleted
        if (table === USERS_TABLE && after === null) {
          const deletedUser = before as User;

          console.log(deletedUser);
        }

        if (table === FINANCE_REIMBURSEMENT_REQUESTS_TABLE && before === null) {
          const newReimbursementRequest = after as Reimbursement;

          await this.reimbursementMemphisNewRequestService.producer.produce({
            message: Buffer.from(JSON.stringify(newReimbursementRequest)),
          });
        }

        if (table === FINANCE_REIMBURSEMENT_REQUESTS_TABLE && after === null) {
          const deletedReimbursementRequest = before as Reimbursement;

          console.log('Reimbursement request deleted');
          console.log(deletedReimbursementRequest);
        }

        message.ack();
      });

      this.logger.log('Memphis cdc station is ready');
    } catch (error: unknown) {
      this.logger.error(error);
      this.memphisService.close();
    }
  }
}

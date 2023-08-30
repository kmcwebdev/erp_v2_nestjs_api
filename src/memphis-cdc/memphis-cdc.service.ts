import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Consumer, MemphisService, Message, Producer } from 'memphis-dev';
import { CdcRequestEnvelope } from './common/interface/requestEnvelope.interface';
import { USERS_TABLE } from 'src/users/common/constant';
import { User } from 'src/users/common/interface/user.interface';
import { FINANCE_REIMBURSEMENT_REQUESTS_TABLE } from './common/constant';
import { Reimbursement } from 'src/finance/common/interface/reimbursement.interface';
import { NewUserMemphisService } from 'src/users/services/new-user.memphis.service';
import { UpdateUserMemphisService } from 'src/users/services/update-user.memphis.service';

@Injectable()
export class MemphisCdcService {
  private readonly logger = new Logger(MemphisCdcService.name);
  consumer: Consumer;
  producer: Producer;

  constructor(
    private readonly configService: ConfigService,
    private readonly memphisService: MemphisService,
    private readonly newUserMemphisService: NewUserMemphisService,
    private readonly updateUserMemphisService: UpdateUserMemphisService,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.memphisService.connect({
        host: this.configService.get<string>('MEMPHIS_HOST'),
        username: this.configService.get<string>('MEMPHIS_USERNAME'),
        password: this.configService.get<string>('MEMPHIS_PASSWORD'),
      });

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

          console.log('New reimbursement request created');
          console.log(newReimbursementRequest);
        }

        if (table === FINANCE_REIMBURSEMENT_REQUESTS_TABLE && after === null) {
          const deletedReimbursementRequest = before as Reimbursement;

          console.log('Reimbursement request deleted');
          console.log(deletedReimbursementRequest);
        }

        message.ack();
      });
    } catch (error: unknown) {
      this.logger.error(error);
      this.memphisService.close();
    }
  }
}

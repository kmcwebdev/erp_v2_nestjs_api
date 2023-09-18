import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Consumer, MemphisService, Message, Producer } from 'memphis-dev';
import { InjectKysely } from 'nestjs-kysely';
import { DB } from 'src/common/types';
import { UsersApiService } from '../users.api.service';
import { RequestUser } from 'src/auth/common/interface/propelauthUser.interface';

@Injectable()
export class NewUserMemphisService implements OnModuleInit {
  private readonly logger = new Logger(NewUserMemphisService.name);

  consumer: Consumer;
  producer: Producer;

  constructor(
    private readonly memphisService: MemphisService,
    private readonly usersApiService: UsersApiService,
    @InjectKysely() private readonly pgsql: DB,
  ) {}

  private async updateUserPropelauthUserId(data: {
    userId: string;
    email: string;
  }) {
    try {
      const { userId, email } = data;

      const updatedUser = await this.pgsql
        .updateTable('users')
        .set({
          propelauth_user_id: userId,
          temporary_propelauth_user_id: false,
        })
        .where('users.email', '=', email)
        .executeTakeFirst();

      return updatedUser;
    } catch (error) {
      this.logger.error(error);
    }
  }

  async onModuleInit() {
    try {
      this.consumer = await this.memphisService.consumer({
        stationName: 'erp.reimbursement.new-user',
        consumerName: 'erp.reimbursement.new-user.consumer-name',
        consumerGroup: 'erp.reimbursement.new-user.consumer-group',
      });

      this.producer = await this.memphisService.producer({
        stationName: 'erp.reimbursement.new-user',
        producerName: 'erp.reimbursement.new-user.producer-name',
      });

      this.consumer.on('message', async (message: Message) => {
        const data: RequestUser = JSON.parse(
          message.getData().toString() || '{}',
        );

        const propelauthUser =
          await this.usersApiService.fetchUserInPropelauthByEmail(data.email);

        if (!propelauthUser) {
          const newPropelauthUser =
            await this.usersApiService.createUserInPropelauth(data.email);

          await this.updateUserPropelauthUserId({
            userId: newPropelauthUser.userId,
            email: newPropelauthUser.email,
          });

          // Send email to user with temporary password

          message.ack();

          return;
        }

        await this.updateUserPropelauthUserId({
          userId: propelauthUser.userId,
          email: data.email,
        });

        message.ack();
      });

      this.logger.log('Memphis user created station is ready 👨‍👨‍👦‍👦 🚀');
    } catch (error: unknown) {
      this.logger.error(error);
      await this.memphisService.close();
    }
  }
}

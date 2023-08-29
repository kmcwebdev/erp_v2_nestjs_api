import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Consumer, MemphisService, Message, Producer } from 'memphis-dev';
import { User } from '../common/interface/user.interface';
import { InjectKysely } from 'nestjs-kysely';
import { DB } from 'src/common/types';
import { propelauth } from 'src/common/lib/propelauth';

@Injectable()
export class NewUserMemphisService implements OnModuleInit {
  private readonly logger = new Logger(NewUserMemphisService.name);

  consumer: Consumer;
  producer: Producer;

  constructor(
    private readonly configService: ConfigService,
    @InjectKysely() private readonly pgsql: DB,
    private readonly memphisService: MemphisService,
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
      await this.memphisService.connect({
        host: this.configService.get<string>('MEMPHIS_HOST'),
        username: this.configService.get<string>('MEMPHIS_USERNAME'),
        password: this.configService.get<string>('MEMPHIS_PASSWORD'),
      });

      this.consumer = await this.memphisService.consumer({
        stationName: 'erp.new-user',
        consumerName: 'erp.new-user.consumer-name',
        consumerGroup: 'erp.new-user.consumer-group',
      });

      this.consumer.on('message', async (message: Message) => {
        const data: User = JSON.parse(message.getData().toString() || '{}');

        const propelauthUser = await propelauth.fetchUserMetadataByEmail(
          data.email,
        );

        if (!propelauthUser) {
          const temporaryPassword = String(new Date());

          const isKmcSolutions = data.email.includes('@kmc.solutions');
          const orgId = isKmcSolutions
            ? this.configService.get('PROPELAUTH_SOLUTIONS_ORG_ID')
            : this.configService.get('PROPELAUTH_EXTERNAL_ORG_ID');

          const newPropelauthUser = await propelauth.createUser({
            email: data.email,
            password: temporaryPassword,
            askUserToUpdatePasswordOnLogin: true,
            sendEmailToConfirmEmailAddress: true,
          });

          await propelauth.addUserToOrg({
            userId: newPropelauthUser.userId,
            orgId,
            role: 'user',
          });

          await this.updateUserPropelauthUserId({
            userId: newPropelauthUser.userId,
            email: data.email,
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

      this.producer = await this.memphisService.producer({
        stationName: 'erp.new-user',
        producerName: 'erp.new-user.producer-name',
      });
    } catch (error: unknown) {
      this.logger.error(error);
      this.memphisService.close();
    }
  }
}

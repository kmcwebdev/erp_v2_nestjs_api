import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Consumer, MemphisService, Message, Producer } from 'memphis-dev';
import { User } from '../common/interface/user.interface';
import { InjectKysely } from 'nestjs-kysely';
import { ERPHRV1User } from '../common/interface/erpHrV1User.dto';
import { DB } from 'src/common/types';

@Injectable()
export class UpdateUserMemphisService implements OnModuleInit {
  private readonly logger = new Logger(UpdateUserMemphisService.name);

  consumer: Consumer;
  producer: Producer;

  constructor(
    private readonly configService: ConfigService,
    @InjectKysely() private readonly pgsql: DB,
    private readonly memphisService: MemphisService,
  ) {}

  private async fetchUserByEmailInERPV2(email: string) {
    try {
      const user = await this.pgsql
        .selectFrom('users')
        .select('user_id')
        .where('users.email', '=', email)
        .executeTakeFirst();

      return user;
    } catch (error) {
      this.logger.error(error);
    }
  }

  private async fetchUserVisaApplicationDetailsByEmailInERPHrV1(
    email: string,
  ): Promise<ERPHRV1User> {
    try {
      const NODE_ENV = this.configService.get('NODE_ENV');
      const API_KEY = this.configService.get('ERP_HR_V1_API_KEY');
      const BASE_URL =
        NODE_ENV === 'development'
          ? this.configService.get('ERP_HR_V1_DEV_BASE_URL')
          : this.configService.get('ERP_HR_V1_DEV_BASE_URL');

      const response = await fetch(
        `${BASE_URL}/api/employees/visa-application-details?email=${email}`,
        {
          headers: {
            'Content-Type': 'application/json',
            'x-auth': API_KEY,
          },
        },
      );

      const user = await response.json();

      if (!response.ok) {
        throw new Error(user?.message || "Couldn't fetch user");
      }

      return user;
    } catch (error: unknown) {
      this.logger.error(error);
    }
  }

  private async updateUserUsingERPHrV1(data: ERPHRV1User) {
    try {
      const { employeeID, clientId, client, position } = data;

      const updatedUser = await this.pgsql
        .updateTable('users')
        .set({
          employee_id: employeeID,
          client_id: clientId,
          client_name: client,
          position,
        })
        .executeTakeFirst();

      return updatedUser;
    } catch (error: unknown) {
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
        stationName: 'erp.update-user',
        consumerName: 'erp.update-user.consumer-name',
        consumerGroup: 'erp.update-user.consumer-group',
      });

      this.consumer.on('message', async (message: Message) => {
        const data: User = JSON.parse(message.getData().toString() || '{}');

        console.log(data);

        message.ack();
      });

      this.producer = await this.memphisService.producer({
        stationName: 'erp.update-user',
        producerName: 'erp.update-user.producer-name',
      });
    } catch (error: unknown) {
      this.logger.error(error);
      this.memphisService.close();
    }
  }
}

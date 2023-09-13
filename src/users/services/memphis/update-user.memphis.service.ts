import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Consumer, MemphisService, Message, Producer } from 'memphis-dev';
import { InjectKysely } from 'nestjs-kysely';
import { ERPHRV1User } from '../../common/interface/erpHrV1User.dto';
import { DB } from 'src/common/types';
import { RequestUser } from 'src/auth/common/interface/propelauthUser.interface';

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

  private async fetchUserVisaApplicationDetailsByEmailInERPHrV1(
    email: string,
  ): Promise<ERPHRV1User> {
    try {
      const NODE_ENV = this.configService.get('NODE_ENV');
      const API_KEY = this.configService.get('ERP_HR_V1_API_KEY');
      const BASE_URL =
        NODE_ENV === 'development'
          ? this.configService.get('ERP_HR_V1_DEV_BASE_URL')
          : this.configService.get('ERP_HR_V1_PROD_BASE_URL');

      const response = await fetch(
        `${BASE_URL}/api/employees/details?email=${email}`,
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
      const { sr, name, firstName, lastName, clientId, client, position } =
        data;

      const updatedUser = await this.pgsql
        .updateTable('users')
        .set({
          employee_id: sr || 'Not set in erp hr',
          full_name: name,
          first_name: firstName,
          last_name: lastName,
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
      this.consumer = await this.memphisService.consumer({
        stationName: 'erp.reimbursement.update-user',
        consumerName: 'erp.reimbursement.update-user.consumer-name',
        consumerGroup: 'erp.reimbursement.update-user.consumer-group',
      });

      this.consumer.on('message', async (message: Message) => {
        const data: RequestUser = JSON.parse(
          message.getData().toString() || '{}',
        );

        console.log(data);

        message.ack();
      });

      this.producer = await this.memphisService.producer({
        stationName: 'erp.reimbursement.update-user',
        producerName: 'erp.reimbursement.update-user.producer-name',
      });

      this.logger.log('Memphis user update station is ready');
    } catch (error: unknown) {
      this.logger.error(error);
      this.memphisService.close();
    }
  }
}
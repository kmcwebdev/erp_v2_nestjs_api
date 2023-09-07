import { Logger, Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { configSchema } from './common/schema/config.schema';
import { FinanceModule } from './finance/finance.module';
import { LegalAndComplianceModule } from './legal-and-compliance/legal-and-compliance.module';
import { APP_PIPE } from '@nestjs/core';
import { ZodValidationPipe } from 'nestjs-zod';
import { DevtoolsModule } from '@nestjs/devtools-integration';
import { UsersModule } from './users/users.module';
import { MemphisCdcModule } from './memphis-cdc/memphis-cdc.module';
import { MemphisModule, MemphisService } from 'memphis-dev';
import { PostgresModule } from './common/database/postgres.module';
import { AuthModule } from './auth/auth.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { MemphisDevModule } from './memphis-dev/memphis-dev.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (config) => {
        return configSchema.parse(config);
      },
      envFilePath: ['.env', '.env.*'],
    }),
    EventEmitterModule.forRoot(),
    DevtoolsModule.register({
      http: process.env.NODE_ENV !== 'production',
    }),
    MemphisModule.register(),
    MemphisDevModule,
    MemphisCdcModule,
    PostgresModule,
    AuthModule,
    UsersModule,
    FinanceModule,
    LegalAndComplianceModule,
  ],
  providers: [
    {
      provide: APP_PIPE,
      useClass: ZodValidationPipe,
    },
  ],
})
export class AppModule implements OnModuleInit {
  private readonly logger = new Logger(AppModule.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly memphisService: MemphisService,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.memphisService.connect({
        host: this.configService.get<string>('MEMPHIS_HOST'),
        username: this.configService.get<string>('MEMPHIS_USERNAME'),
        password: this.configService.get<string>('MEMPHIS_PASSWORD'),
        accountId: 1,
      });
    } catch (error: unknown) {
      this.logger.error("Couldn't connect to Memphis");
      await this.memphisService.close();
    }
  }
}

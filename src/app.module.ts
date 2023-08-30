import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { configSchema } from './common/schema/config.schema';
import { FinanceModule } from './finance/finance.module';
import { LegalAndComplianceModule } from './legal-and-compliance/legal-and-compliance.module';
import { APP_PIPE } from '@nestjs/core';
import { ZodValidationPipe } from 'nestjs-zod';
import { DevtoolsModule } from '@nestjs/devtools-integration';
import { UsersModule } from './users/users.module';
import { MemphisCdcModule } from './memphis-cdc/memphis-cdc.module';
import { MemphisModule } from 'memphis-dev';
import { PostgresModule } from './common/database/postgres.module';
import { AuthModule } from './auth/auth.module';
import { EventEmitterModule } from '@nestjs/event-emitter';

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
    MemphisModule.register(),
    MemphisCdcModule,
    PostgresModule,
    AuthModule,
    UsersModule,
    FinanceModule,
    LegalAndComplianceModule,
    DevtoolsModule.register({
      http: process.env.NODE_ENV !== 'production',
    }),
  ],
  providers: [
    {
      provide: APP_PIPE,
      useClass: ZodValidationPipe,
    },
  ],
})
export class AppModule {}

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { configSchema } from './common/schema/config.schema';
import { FinanceModule } from './finance/finance.module';
import { LegalAndComplianceModule } from './legal-and-compliance/legal-and-compliance.module';
import { APP_PIPE } from '@nestjs/core';
import { ZodValidationPipe } from 'nestjs-zod';
import { DevtoolsModule } from '@nestjs/devtools-integration';
import { UsersModule } from './users/users.module';
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
    MemphisDevModule,
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
export class AppModule {}

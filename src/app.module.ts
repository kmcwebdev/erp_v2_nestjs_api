import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { configSchema } from './common/schema/config.schema';
import { FinanceModule } from './finance/finance.module';
import { LegalAndComplianceModule } from './legal-and-compliance/legal-and-compliance.module';
import { APP_GUARD, APP_PIPE } from '@nestjs/core';
import { ZodValidationPipe } from 'nestjs-zod';
import { DevtoolsModule } from '@nestjs/devtools-integration';
import { UsersModule } from './users/users.module';
import { PostgresModule } from './common/database/postgres.module';
import { AuthModule } from './auth/auth.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { MemphisDevModule } from './memphis-dev/memphis-dev.module';
import { FilestackModule } from './filestack/filestack.module';
import { PropelauthGuard } from './auth/common/guard/propelauth.guard';

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
    FilestackModule,
  ],
  providers: [
    {
      provide: APP_PIPE,
      useClass: ZodValidationPipe,
    },
    {
      provide: APP_GUARD,
      useClass: PropelauthGuard,
    },
  ],
})
export class AppModule {}

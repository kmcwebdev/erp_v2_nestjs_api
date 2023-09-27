import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PostgresDialect } from 'kysely';
import { KyselyModule as NestKyselyModule } from 'nestjs-kysely';
import { Pool } from 'pg';

@Module({
  imports: [
    NestKyselyModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => ({
        dialect: new PostgresDialect({
          pool: new Pool({
            user: config.get('DATABASE_USER'),
            host: config.get('DATABASE_HOST'),
            database: config.get('DATABASE_NAME'),
            password: config.get('DATABASE_PASS'),
            port: Number(config.get('DATABASE_PORT')),
            ssl: true,
          }),
        }),
      }),
    }),
  ],
})
export class PostgresModule {}

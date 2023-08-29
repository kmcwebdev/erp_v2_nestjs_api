import { Module } from '@nestjs/common';
import { KyselyPgService } from './kysely-pg.service';

@Module({
  providers: [KyselyPgService],
  exports: [KyselyPgService],
})
export class KyselyPgModule {}

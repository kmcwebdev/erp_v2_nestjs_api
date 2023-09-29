import { Injectable, Logger } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { DB } from 'src/common/types';

@Injectable()
export class ReimbursementEmailRejectionService {
  private readonly logger = new Logger(ReimbursementEmailRejectionService.name);

  constructor(@InjectKysely() private readonly pgsql: DB) {}

  async reject(data: any) {
    return 'OK';
  }
}

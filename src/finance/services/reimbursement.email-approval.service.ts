import { Injectable, Logger } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { DB } from 'src/common/types';

@Injectable()
export class ReimbursementEmailApprovalService {
  private readonly logger = new Logger(ReimbursementEmailApprovalService.name);

  constructor(@InjectKysely() private readonly pgsql: DB) {}

  async approve(data: any) {
    return 'OK';
  }
}

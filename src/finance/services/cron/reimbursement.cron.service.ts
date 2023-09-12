import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class ReimbursementCronService {
  private readonly logger = new Logger(ReimbursementCronService.name);

  @Cron(CronExpression.EVERY_5_MINUTES)
  handleUpdateReimbursementRequestThatHasNoUpApproverMatrix() {
    return null;
  }

  /**
   * 10th and 25th of every month
   */
  @Cron('0 0 10,25 * *')
  handleCron() {
    this.logger.log('Hello');
  }
}

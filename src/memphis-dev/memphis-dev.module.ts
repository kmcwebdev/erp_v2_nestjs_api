import { Logger, Module, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MemphisModule, MemphisService } from 'memphis-dev';

@Module({
  imports: [MemphisModule.register()],
})
export class MemphisDevModule implements OnModuleInit {
  private readonly logger = new Logger(MemphisDevModule.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly memphisService: MemphisService,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.memphisService.connect({
        host: this.configService.get<string>('MEMPHIS_HOST'),
        accountId: Number(this.configService.get<string>('MEMPHIS_ACCOUNT_ID')),
        username: this.configService.get<string>('MEMPHIS_USERNAME'),
        password: this.configService.get<string>('MEMPHIS_PASSWORD'),
      });
      this.logger.log('Connected to memphis.dev');
    } catch (error: unknown) {
      this.logger.error("Couldn't connect to Memphis");
      await this.memphisService.close();
    }
  }
}

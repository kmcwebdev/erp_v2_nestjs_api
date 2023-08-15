import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Consumer, MemphisService, Message, Producer } from 'memphis-dev';

@Injectable()
export class ReimbursementMemphisService implements OnModuleInit {
  private readonly logger = new Logger(ReimbursementMemphisService.name);
  consumer: Consumer;
  producer: Producer;

  constructor(
    private configService: ConfigService,
    private memphisService: MemphisService,
  ) {}

  async onModuleInit() {
    try {
      await this.memphisService.connect({
        host: this.configService.get<string>('MEMPHIS_HOST'),
        username: this.configService.get<string>('MEMPHIS_USERNAME'),
        password: this.configService.get<string>('MEMPHIS_PASSWORD'),
      });

      this.consumer = await this.memphisService.consumer({
        stationName: 'chat',
        consumerName: 'chatConsumer',
        consumerGroup: 'chatConsumers',
      });

      this.consumer.on('message', async (message: Message) => {
        const msg = message.getData();

        console.log(msg.toString());

        message.ack();
      });

      this.consumer.on('error', (error: Error) => {
        this.logger.error(error);
      });

      this.producer = await this.memphisService.producer({
        stationName: 'chat',
        producerName: 'chatProducer',
      });

      this.producer.produce({
        message: Buffer.from('Wassap'),
      });
    } catch (error: unknown) {
      this.logger.error(error);
      this.memphisService.close();
    }
  }
}

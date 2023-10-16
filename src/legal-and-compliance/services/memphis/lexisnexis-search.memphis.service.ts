import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Consumer, MemphisService, Message, Producer } from 'memphis-dev';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { HttpService } from '@nestjs/axios';
import { catchError, firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import { ConfigService } from '@nestjs/config';
import { InjectKysely } from 'nestjs-kysely';
import { DB } from 'src/common/types';
import { LexisnexisSearchType } from 'src/legal-and-compliance/common/dto/lexisnexis-search.dto';
import { LexisnexisSearchMetadata } from 'src/legal-and-compliance/common/interface/lexisnexis-search-metadata.interface';
import { LexisnexisDownloadMetadata } from 'src/legal-and-compliance/common/interface/lexisnexis-download-metadata.inteface';

type LacLexisnexisSearch = LexisnexisSearchType & LexisnexisSearchMetadata;

@Injectable()
export class LacLexisnexisSearchService implements OnModuleInit {
  private readonly logger = new Logger(LacLexisnexisSearchService.name);

  consumer: Consumer;
  producer: Producer;

  constructor(
    @InjectKysely() private readonly pgsql: DB,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly eventEmitter: EventEmitter2,
    private readonly memphisService: MemphisService,
  ) {}

  @OnEvent('lac-lexisnexis-search')
  async triggerMemphisEvent(data: LacLexisnexisSearch) {
    return await this.producer.produce({
      message: Buffer.from(JSON.stringify(data)),
    });
  }

  async onModuleInit() {
    try {
      this.consumer = await this.memphisService.consumer({
        stationName: 'erp.lac.lexisnexis-search',
        consumerName: 'erp.lac.lexisnexis-search.consumer-name',
        consumerGroup: 'erp.lac.lexisnexis-search.consumer-group',
      });

      this.consumer.on('message', async (message: Message) => {
        const data: LacLexisnexisSearch = JSON.parse(
          message.getData().toString(),
        );

        const searchQuery = await firstValueFrom(
          this.httpService
            .get<{ totalSize: number; downloadId: string }>(
              '/api/v1/diligence/search',
              {
                baseURL: 'https://metabase.moreover.com',
                headers: {
                  'Content-Type': 'application/json',
                },
                params: {
                  key: this.configService.get('LEXISNEXIS_API_KEY'),
                  searchQueryType: data.search_query_type,
                  searchQuery: data.search_query,
                  category: data.category,
                  pageSize: 5,
                  proximity: data.enable_proximity ? 10 : 0,
                  contentLanguage: 'English',
                  downloadFormat: 'PDF',
                },
              },
            )
            .pipe(
              catchError(async (error: AxiosError) => {
                this.logger.error(error?.response?.data);

                await this.pgsql
                  .updateTable('lexisnexis_search')
                  .set({
                    finished_at: new Date(),
                    report_generation_status: 'Failed',
                    report_generation_desc: error.response.statusText,
                  })
                  .where('lexisnexis_search_id', '=', data.lexisnexis_search_id)
                  .executeTakeFirstOrThrow();

                throw Error('Failed to perform lexisnexis search');
              }),
            ),
        );

        if (searchQuery.status === 200) {
          await this.pgsql
            .updateTable('lexisnexis_search')
            .set({
              total_size: searchQuery.data.totalSize,
              download_id: searchQuery.data.downloadId,
              finished_at: new Date(),
              report_generation_status: 'Success',
              report_generation_desc: null,
            })
            .where('lexisnexis_search_id', '=', data.lexisnexis_search_id)
            .executeTakeFirstOrThrow();

          const downloadPayload: LexisnexisDownloadMetadata = {
            lexisnexis_search_id: data.lexisnexis_search_id,
            category: data.category,
            search_query: data.search_query,
            download_id: searchQuery.data.downloadId,
          };

          this.eventEmitter.emit('lac-lexisnexis-download', downloadPayload);

          message.ack();
        }
      });

      this.producer = await this.memphisService.producer({
        stationName: 'erp.lac.lexisnexis-search',
        producerName: 'erp.lac.lexisnexis-search.producer-name',
      });

      this.logger.log(
        'Memphis legal and compliance lexisnexis search station is ready 🔎 🚀',
      );
    } catch (error: any) {
      this.logger.error(error.message);
    }
  }
}

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Consumer, MemphisService, Message, Producer } from 'memphis-dev';
import { filestackClient } from 'src/common/lib/filestack';
import { WritableStreamBuffer } from 'stream-buffers';
import { OnEvent } from '@nestjs/event-emitter';
import { HttpService } from '@nestjs/axios';
import { catchError, firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import { InjectKysely } from 'nestjs-kysely';
import { DB } from 'src/common/types';
import { LexisnexisDownloadMetadata } from 'src/legal-and-compliance/common/interface/lexisnexis-download-metadata.inteface';
import { FilestackResponse } from 'src/common/interface/filestack-response.interface';

@Injectable()
export class LacLexisnexisDownloadService implements OnModuleInit {
  private readonly logger = new Logger(LacLexisnexisDownloadService.name);

  consumer: Consumer;
  producer: Producer;

  uploadLocation = '';
  uploadContainer = '';
  uploadAccess = '';

  constructor(
    @InjectKysely() private readonly pgsql: DB,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly memphisService: MemphisService,
  ) {
    this.uploadLocation = this.configService.get('UPLOAD_LOCATION');
    this.uploadContainer = this.configService.get(
      'LEXISNEXIS_ATTACHMENT_UPLOAD_CONTAINER',
    );
    this.uploadAccess = this.configService.get(
      'LEXISNEXIS_ATTACHMENT_UPLOAD_ACCESS',
    );
  }

  @OnEvent('lac-lexisnexis-download')
  async triggerMemphisEvent(data: LexisnexisDownloadMetadata) {
    return await this.producer.produce({
      message: Buffer.from(JSON.stringify(data)),
    });
  }

  async onModuleInit() {
    try {
      this.consumer = await this.memphisService.consumer({
        stationName: 'erp.lac.lexisnexis-download',
        consumerName: 'erp.lac.lexisnexis-download.consumer-name',
        consumerGroup: 'erp.lac.lexisnexis-download.consumer-group',
        pullIntervalMs: 5000,
      });

      this.consumer.on('message', async (message: Message) => {
        const data: LexisnexisDownloadMetadata = JSON.parse(
          message.getData().toString(),
        );

        const lexisSearch = await this.pgsql
          .selectFrom('lexisnexis_search')
          .select('lexisnexis_search_id')
          .where('lexisnexis_search_id', '=', data.lexisnexis_search_id)
          .executeTakeFirst();

        if (!lexisSearch) {
          return message.ack();
        }

        const base64Pdf = await firstValueFrom(
          this.httpService
            .get<{ fileBase64: string; status: string }>(
              '/api/v1/diligence/download',
              {
                baseURL: 'https://metabase.moreover.com',
                headers: {
                  'Content-Type': 'application/json',
                },
                params: {
                  downloadId: data.download_id,
                },
              },
            )
            .pipe(
              catchError(async (error: AxiosError) => {
                const response = error.response.data as { status: string };

                this.logger.error(JSON.stringify(error?.response?.data));

                await this.pgsql
                  .updateTable('lexisnexis_search')
                  .set({
                    finished_at: new Date(),
                    report_generation_status: 'Failed',
                    report_generation_desc: `Download - ${response.status}`,
                  })
                  .where('lexisnexis_search_id', '=', data.lexisnexis_search_id)
                  .executeTakeFirstOrThrow();

                throw Error('Failed to perform lexisnexis search');
              }),
            ),
        );

        console.log(base64Pdf.data);

        if (base64Pdf.status === 200 && base64Pdf.data.status === 'COMPLETE') {
          const pdf = Buffer.from(base64Pdf.data.fileBase64, 'base64');
          const streamBuffer = new WritableStreamBuffer();

          streamBuffer.write(pdf);
          streamBuffer.end();

          const contents = streamBuffer.getContents();

          const dateNumber = Date.now();

          const filename = `${data.search_query
            .replace(/\s/g, '-')
            .toLowerCase()}_${data.category.toLowerCase()}`;

          const uniqueFilename = `${filename}_${dateNumber}.pdf`.toLowerCase();

          if (!contents) throw new Error('PDF content is empty');

          const fileHandle: FilestackResponse = await filestackClient.upload(
            contents,
            {
              tags: {
                search_query: filename,
              },
            },
            {
              location: this.uploadLocation,
              filename: uniqueFilename,
              container: this.uploadContainer,
              access: this.uploadAccess,
            },
          );

          await this.pgsql
            .updateTable('lexisnexis_search')
            .set({
              pdf_report_url: fileHandle.url,
            })
            .where('lexisnexis_search_id', '=', data.lexisnexis_search_id)
            .executeTakeFirstOrThrow();

          message.ack();
        }
      });

      this.producer = await this.memphisService.producer({
        stationName: 'erp.lac.lexisnexis-download',
        producerName: 'erp.lac.lexisnexis-download.producer-name',
      });

      this.logger.log(
        'Memphis legal and compliance lexisnexis download station is ready ⬇️  🚀',
      );
    } catch (error: any) {
      this.logger.error(error.message);
    }
  }
}

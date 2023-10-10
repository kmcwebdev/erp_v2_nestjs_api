import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectKysely } from 'nestjs-kysely';
import { DB } from 'src/common/types';
import { LexisnexisSearchType } from '../common/dto/lexisnexis-search.dto';
import { LexisnexisDownloadType } from '../common/dto/lexisnexis-download.dto';

@Injectable()
export class LegalAndComplianceService {
  constructor(
    @InjectKysely() private readonly pgsql: DB,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async lexisnexisSearch(data: LexisnexisSearchType) {
    const categories = [
      'negativeNews',
      'news',
      'sanctions',
      'legal',
      'directors',
      'biographical',
      'peps',
      'dockets',
      'federalDockets',
      'agencyDecision',
      'lawReviews',
      'esgRatings',
    ];

    const insertJob = await this.pgsql
      .insertInto('lexisnexis_search')
      .values(
        categories.map((category) => ({
          search_query: data.search_query,
          search_category: category,
          query_type: data.search_query_type,
        })),
      )
      .returningAll()
      .execute();

    insertJob.forEach((job) =>
      this.eventEmitter.emit('lac-lexisnexis-search', {
        lexisnexis_search_id: job.lexisnexis_search_id,
        category: job.search_category,
        search_query: job.search_query,
        search_query_type: job.query_type,
        enable_proximity: data.enable_proximity,
      }),
    );

    return insertJob;
  }

  lexisnexisDownload(data: LexisnexisDownloadType) {
    return this.eventEmitter.emit('lac-lexisnexis-download', {
      lexisnexis_search_id: data.lexisnexis_search_id,
      search_query: data.search_query,
      category: data.category,
      download_id: data.download_id,
    });
  }
}

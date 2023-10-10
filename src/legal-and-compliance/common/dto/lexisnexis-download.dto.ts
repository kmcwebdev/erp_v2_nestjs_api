import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

// TODO: Update schema description and message
const LexisnexisDownloadSchema = z.object({
  lexisnexis_search_id: z.string().uuid(),
  category: z.string().nonempty(),
  search_query: z.string().nonempty(),
  search_query_type: z.enum(['people', 'company']).default('company'),
  download_id: z.string().nonempty(),
});

export type LexisnexisDownloadType = z.infer<typeof LexisnexisDownloadSchema>;

export class LexisnexisDownloadDto extends createZodDto(
  LexisnexisDownloadSchema,
) {}

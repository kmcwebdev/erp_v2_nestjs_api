import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

// TODO: Update schema description and message
const LexisnexisDownloadSchema = z.object({
  lexisnexis_search_id: z.string().uuid(),
  category: z.string().min(1),
  search_query: z.string().min(1),
  search_query_type: z.enum(['people', 'company']).default('company'),
  download_id: z.string().min(1),
});

export type LexisnexisDownloadType = z.infer<typeof LexisnexisDownloadSchema>;

export class LexisnexisDownloadDto extends createZodDto(
  LexisnexisDownloadSchema,
) {}

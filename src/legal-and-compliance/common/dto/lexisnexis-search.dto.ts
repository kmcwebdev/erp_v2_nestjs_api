import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

// TODO: Update schema description and message
const LexisnexisSearchSchema = z.object({
  search_query: z.string().nonempty(),
  search_query_type: z.enum(['company', 'people']).default('company'),
  enable_proximity: z.preprocess(
    (input) => input === 'true',
    z.boolean().default(true),
  ),
});

export type LexisnexisSearchType = z.infer<typeof LexisnexisSearchSchema>;

export class LexisnexisSearchDto extends createZodDto(LexisnexisSearchSchema) {}

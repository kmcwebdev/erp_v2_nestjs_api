import { z } from 'zod';

export const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production'], {
    description: 'Node environment',
    required_error: 'NODE_ENV is required',
    invalid_type_error:
      'NODE_ENV must be one of "development", "staging", or "production"',
  }),
  DATABASE_URL: z
    .string({
      description: 'Postgres connection string',
      required_error: 'DATABASE_URL is required',
      invalid_type_error: 'DATABASE_URL must be a string',
    })
    .url({
      message: 'DATABASE_URL must be a valid URL',
    }),
  DATABASE_HOST: z
    .string({
      description: 'Postgres host string',
      required_error: 'DATABASE_HOST is required',
      invalid_type_error: 'DATABASE_HOST must be a string',
    })
    .min(1, {
      message: 'DATABASE_HOST must be at least 1 character',
    }),
  DATABASE_USER: z
    .string({
      description: 'Postgres user',
      required_error: 'DATABASE_USER is required',
      invalid_type_error: 'DATABASE_USER must be a string',
    })
    .min(1, {
      message: 'DATABASE_USER must be at least 1 character',
    }),
  DATABASE_PASS: z
    .string({
      description: 'Postgres password',
      required_error: 'DATABASE_PASS is required',
      invalid_type_error: 'DATABASE_PASS must be a string',
    })
    .min(1, {
      message: 'DATABASE_PASS must be at least 1 character',
    }),
  DATABASE_NAME: z
    .string({
      description: 'Postgres database',
      required_error: 'DATABASE_NAME is required',
      invalid_type_error: 'DATABASE_NAME must be a string',
    })
    .min(1, {
      message: 'DATABASE_NAME must be at least 1 character',
    }),
  DATABASE_PORT: z
    .string({
      description: 'Postgres port',
      required_error: 'DATABASE_PORT is required',
      invalid_type_error: 'DATABASE_PORT must be a string',
    })
    .min(1, {
      message: 'DATABASE_PORT must be at least 1 character',
    }),
  MEMPHIS_HOST: z
    .string({
      description: 'Memphis host',
      required_error: 'MEMPHIS_HOST is required',
      invalid_type_error: 'MEMPHIS_HOST must be a string',
    })
    .ip({
      message: 'MEMPHIS_HOST must be a valid IP address',
    }),
  MEMPHIS_USERNAME: z
    .string({
      description: 'Memphis username',
      required_error: 'MEMPHIS_USERNAME is required',
      invalid_type_error: 'MEMPHIS_USERNAME must be a string',
    })
    .min(1, {
      message: 'MEMPHIS_USERNAME must be at least 1 character',
    }),
  MEMPHIS_PASSWORD: z
    .string({
      description: 'Memphis password',
      required_error: 'MEMPHIS_PASSWORD is required',
      invalid_type_error: 'MEMPHIS_PASSWORD must be a string',
    })
    .min(1, {
      message: 'MEMPHIS_PASSWORD must be at least 1 character',
    }),
  PROPELAUTH_AUTH_URL: z
    .string({
      description: 'PropelAuth auth URL',
      required_error: 'PROPELAUTH_AUTH_URL is required',
      invalid_type_error: 'PROPELAUTH_AUTH_URL must be a string',
    })
    .url({
      message: 'PROPELAUTH_AUTH_URL must be a valid URL',
    }),
  PROPELAUTH_API_KEY: z
    .string({
      description: 'PropelAuth API key',
      required_error: 'PROPELAUTH_API_KEY is required',
      invalid_type_error: 'PROPELAUTH_API_KEY must be a string',
    })
    .min(1, {
      message: 'PROPELAUTH_API_KEY must be at least 1 character',
    }),
  PROPELAUTH_EXTERNAL_ORG_ID: z
    .string({
      description: 'PropelAuth external org ID',
      required_error: 'PROPELAUTH_EXTERNAL_ORG_ID is required',
      invalid_type_error: 'PROPELAUTH_EXTERNAL_ORG_ID must be a string',
    })
    .uuid({
      message: 'PROPELAUTH_EXTERNAL_ORG_ID must be a valid UUID',
    }),
  PROPELAUTH_SOLUTIONS_ORG_ID: z
    .string({
      description: 'PropelAuth kmc solutions org ID',
      required_error: 'PROPELAUTH_SOLUTIONS_ORG_ID is required',
      invalid_type_error: 'PROPELAUTH_SOLUTIONS_ORG_ID must be a string',
    })
    .uuid({
      message: 'PROPELAUTH_SOLUTIONS_ORG_ID must be a valid UUID',
    }),
  PROPELAUTH_COMMUNITY_ORG_ID: z
    .string({
      description: 'PropelAuth kmc community org ID',
      required_error: 'PROPELAUTH_COMMUNITY_ORG_ID is required',
      invalid_type_error: 'PROPELAUTH_COMMUNITY_ORG_ID must be a string',
    })
    .uuid({
      message: 'PROPELAUTH_COMMUNITY_ORG_ID must be a valid UUID',
    }),
  PROPELAUTH_VERIFIER_KEY: z
    .string({
      description: 'PropelAuth verifier key',
      required_error: 'PROPELAUTH_VERIFIER_KEY is required',
      invalid_type_error: 'PROPELAUTH_VERIFIER_KEY must be a string',
    })
    .min(1, {
      message: 'PROPELAUTH_VERIFIER_KEY must be at least 1 character',
    }),
  ERP_HR_V1_API_KEY: z
    .string({
      description: 'ERP HR V1 API key',
      required_error: 'ERP_HR_V1_API_KEY is required',
      invalid_type_error: 'ERP_HR_V1_API_KEY must be a string',
    })
    .min(1, {
      message: 'ERP_HR_V1_API_KEY must be at least 1 character',
    }),
  ERP_HR_V1_PROD_BASE_URL: z
    .string({
      description: 'ERP HR V1 base URL',
      required_error: 'ERP_HR_V1_PROD_BASE_URL is required',
      invalid_type_error: 'ERP_HR_V1_PROD_BASE_URL must be a string',
    })
    .url({
      message: 'ERP_HR_V1_PROD_BASE_URL must be a valid URL',
    }),
  ERP_HR_V1_DEV_BASE_URL: z
    .string({
      description: 'ERP HR V1 base URL',
      required_error: 'ERP_HR_V1_DEV_BASE_URL is required',
      invalid_type_error: 'ERP_HR_V1_DEV_BASE_URL must be a string',
    })
    .url({
      message: 'ERP_HR_V1_DEV_BASE_URL must be a valid URL',
    }),
});

export type Config = z.infer<typeof configSchema>;

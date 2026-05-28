import { z } from 'zod';

export const configSchema = z.object({
  APP_NAME: z.string().default('nestjs-config-aws-demo'),
  PORT: z.coerce.number().int().positive().default(3000),
  FEATURE_FLAG: z.coerce.boolean().default(false),
});

export type AppConfig = z.infer<typeof configSchema>;

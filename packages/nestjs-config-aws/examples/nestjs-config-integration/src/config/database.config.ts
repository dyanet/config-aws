import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT, 10) || 5432,
  username: process.env.DATABASE_USERNAME || 'postgres',
  password: process.env.DATABASE_PASSWORD, // This can come from AWS Secrets Manager
  database: process.env.DATABASE_NAME || 'myapp',
  ssl: process.env.DATABASE_SSL === 'true',
  poolSize: parseInt(process.env.DATABASE_POOL_SIZE, 10) || 10,
  connectionTimeout: parseInt(process.env.DATABASE_CONNECTION_TIMEOUT, 10) || 30000,
}));
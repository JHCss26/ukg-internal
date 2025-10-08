import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { envValidationSchema } from './validation';
import { join } from 'path';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
      envFilePath: [
        join(process.cwd(), 'env', `.env.${process.env.NODE_ENV}`),
        join(process.cwd(), 'env', '.env'),
      ],
    }),
  ],
})
export class AppConfigModule {}

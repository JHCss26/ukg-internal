// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SqlConfig } from './config/sql.config';
import { AuthModule } from './modules/auth/auth.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { ReportsModule } from './modules/reports/reports.module';
import { envValidationSchema } from './core/config/validation';
import { LoggerModule } from 'nestjs-pino';
import { ScheduleModule } from '@nestjs/schedule';

import { IngestScheduler } from './schedules/ingest.scheduler';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        // pretty print locally
        transport: process.env.NODE_ENV !== 'production'
          ? { target: 'pino-pretty', options: { singleLine: true } }
          : undefined,
      },
    }),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [require('path').resolve(process.cwd(), '.env')],
      validationSchema: envValidationSchema,
      expandVariables: true,
      cache: true,
    }),
    SqlConfig,
    ScheduleModule.forRoot(),
    AuthModule,
    EmployeesModule,
    ReportsModule,
  ],
  providers: [IngestScheduler],
})
export class AppModule { }

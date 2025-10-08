// src/reports/reports.module.ts
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { AuthModule } from '../auth/auth.module';
import { EmployeeReport } from './employee-report.entity'; // <-- your entity

@Module({
  imports: [
    ConfigModule,
    AuthModule,
    TypeOrmModule.forFeature([EmployeeReport]),
    HttpModule.registerAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        baseURL: (cfg.getOrThrow<string>('EMP_API_BASE_URL') ?? '').replace(/\/+$/, '') + '/',
        timeout: parseInt(cfg.getOrThrow<string>('EMP_HTTP_TIMEOUT_MS') ?? '60000', 10),
      }),
    }),
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}

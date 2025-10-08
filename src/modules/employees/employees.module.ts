// src/employees/employees.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';
import { Employee } from './employee.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Employee]),
    AuthModule,
    HttpModule.registerAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        baseURL: (cfg.getOrThrow<string>('EMP_API_BASE_URL') ?? '').replace(/\/+$/, '') + '/',
        timeout: parseInt(cfg.getOrThrow('EMP_HTTP_TIMEOUT_MS') ?? '60000', 10),
      }),
    }),
  ],
  controllers: [EmployeesController],
  providers: [EmployeesService],
  exports: [EmployeesService],
})
export class EmployeesModule {}

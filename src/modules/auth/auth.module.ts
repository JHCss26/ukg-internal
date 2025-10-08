// src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';

@Module({
  imports: [
    ConfigModule,
    HttpModule.registerAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        baseURL: (cfg.getOrThrow<string>('EMP_API_BASE_URL') ?? '').replace(/\/+$/, '') + '/',
        timeout: parseInt(cfg.getOrThrow('EMP_HTTP_TIMEOUT_MS') ?? '60000', 10),
      }),
    }),
  ],
  providers: [AuthService],
  exports: [AuthService], // (export AuthService; HttpService doesn't need exporting)
})
export class AuthModule {}

import { Controller, Get } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Controller()
export class AppController {
  constructor(private readonly ds: DataSource) {}

  @Get()
  root() {
    return { ok: true, service: 'ukg-internal', time: new Date().toISOString() };
  }

  @Get('status')
  async status() {
    const t = Date.now();
    try {
      await this.ds.query('SELECT 1');
      return { service: 'ukg-internal', mssql: { ok: true, latencyMs: Date.now() - t } };
    } catch (e: any) {
      return { service: 'ukg-internal', mssql: { ok: false, error: e?.message || 'unknown' } };
    }
  }
}

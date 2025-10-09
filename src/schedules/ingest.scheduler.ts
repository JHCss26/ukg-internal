import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { EmployeesService } from 'src/modules/employees/employees.service';
import { ReportsService } from 'src/modules/reports/reports.service';

@Injectable()
export class IngestScheduler {
  private readonly logger = new Logger(IngestScheduler.name);
  constructor(
    private readonly cfg: ConfigService,
    private readonly employees: EmployeesService,
    private readonly reports: ReportsService,
  ) {}

  // every minute (adjust as needed)
  @Cron(CronExpression.EVERY_30_MINUTES)
  async tick() {
    try {
      this.logger.log('scheduler: employees sync…');
      await this.employees.fetchAndStoreAll();
    } catch (e) {
      this.logger.error('employees sync failed', e as any);
    }

    const settingId = this.cfg.getOrThrow<string>('EMP_REPORT_SETTING_ID');
    if (!settingId) return;

    // example minimal body — replace with your real one
    const body = {
      company: { short_name: this.cfg.getOrThrow<string>('EMP_API_COMPANY') },
      page: { number: 0, size: 5000 },
      selectors: [{ name: 'TACounterRecordDate', parameters: { RangeType: '1', CalendarType: '1' } }],
    };

    try {
      this.logger.log(`scheduler: report ${settingId}…`);
      await this.reports.runAndStore(settingId, body);
    } catch (e) {
      this.logger.error('report ingest failed', e as any);
    }
  }
}

// src/modules/reports/reports.service.ts
import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { XMLParser } from 'fast-xml-parser';

import { AuthService } from '../auth/auth.service';
import { EmployeeReport } from './employee-report.entity';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);
  private readonly xml = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' });

  constructor(
    private readonly http: HttpService,
    private readonly auth: AuthService,
    @InjectRepository(EmployeeReport)
    private readonly repo: Repository<EmployeeReport>,
  ) {}

  // --------- utilities ---------
  private clean(v: any): string | null {
    const s = v == null ? '' : String(v).trim();
    if (!s || s === '-' || s === '—') return null;
    return s;
  }
  private num(v: any): number | null {
    if (v == null || v === '' || v === '-' || v === '—') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  private first<T>(x: T | T[] | undefined): T | undefined {
    return Array.isArray(x) ? x[0] : (x as any);
  }
  private yyyymmdd(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  private yesterdayStr(): string {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return this.yyyymmdd(d);
  }

  // --------- XML -> flat rows ---------
  private parseFlat(xml: string) {
    const root = this.xml.parse(xml) as any;
    const result = root?.result ?? root;
    const groups = (result?.body?.group ?? []) as any[];

    // column labels
    let columns: string[] = [];
    const topCols = result?.header?.col;
    if (Array.isArray(topCols)) {
      columns = topCols.map((c: any) => String(c?.label ?? '').trim()).filter(Boolean);
    }
    if (!columns.length && groups.length) {
      const g0Cols = groups[0]?.header?.cols?.col ?? [];
      if (Array.isArray(g0Cols)) {
        columns = g0Cols.map((c: any) => String(c?.label ?? '').trim()).filter(Boolean);
      }
    }
    if (!columns.length) {
      const firstRowCols = this.first(groups)?.body?.row?.[0]?.col ?? [];
      columns = Array(firstRowCols.length)
        .fill(0)
        .map((_, i) => `col${i + 1}`);
    }
    const idx = (label: string) => columns.findIndex((c) => c === label);

    const out: Array<Record<string, any>> = [];
    for (const g of groups) {
      // department
      let department: string | null = null;
      const hdrDataCol = g?.header?.data?.col;
      if (hdrDataCol && (hdrDataCol.label ?? '').toLowerCase() === 'default department') {
        department = this.clean(hdrDataCol.data);
      }

      // normalize rows (single or array)
      const rows = Array.isArray(g?.body?.row) ? g.body.row : g?.body?.row ? [g.body.row] : [];
      for (const r of rows) {
        const cols = r?.col ?? [];
        const get = (i: number) => cols[i];

        out.push({
          department,
          employeeId: this.clean(get(idx('Employee ID'))),
          firstName: this.clean(get(idx('First Name'))),
          surname: this.clean(get(idx('Surname'))),
          hourlyPay: this.clean(get(idx('Hourly Pay'))), // keep text like "£13.20"
          scheduledTimeHours: this.num(get(idx('Scheduled Time Hours'))),
          annualLeaveDaysDays: this.num(get(idx('Annual Leave Days Days'))),
          basicHours: this.num(get(idx('Basic Hours'))),
          basicRateTotal: this.num(get(idx('Basic Rate Total'))),
          overtime1Hours: this.num(get(idx('Overtime 1 (Hours)'))),
          overtime1Rate: this.num(get(idx('Overtime 1 (Rate)'))),
          overtime1Total: this.num(get(idx('Overtime 1 Total'))),
          overtime2Hours: this.num(get(idx('Overtime 2 (Hours)'))),
          overtime2Rate: this.num(get(idx('Overtime 2 (Rate)'))),
          overtime2Total: this.num(get(idx('Overtime 2 Total'))),
          workVsScheduledHours: this.num(get(idx('_Work vs Scheduled Hours'))),
          sickHours: this.num(get(idx('Sick Hours'))),
          unauthorisedLeaveHours: this.num(get(idx('Unauthorised Leave Hours'))),
          holidayPay: this.num(get(idx('Holiday Pay'))),
          holidayRate: this.clean(get(idx('Holiday Rate'))), // keep text like "£13.20"
          holidayPayTotal: this.num(get(idx('Holiday Pay Total'))),
          subTotal: this.num(get(idx('Sub Total'))),
          comments: this.clean(get(idx('Comments'))),
        });
      }
    }
    return out;
  }

  // --------- HTTP ---------
  private async fetchXml(settingId: string, body: any) {
    const headers = await this.auth.authHeaders({
      Accept: 'application/xml',
      'Content-Type': 'application/json',
    });
    const path = `v1/report/saved/${encodeURIComponent(settingId)}`;
    const res = await firstValueFrom(
      this.http.post<string>(path, body, { headers, responseType: 'text' as any }),
    );
    return res.data;
  }

  // --------- Public APIs ---------

  /** Fetch & return flat rows (no DB write) */
  async fetchFlat(settingId: string) {
    // body is always the same per your spec
    const body = {
      company: { short_name: await this.auth['cfg'].get<string>('EMP_API_COMPANY') },
      selectors: [
        {
          name: 'TACounterRecordDate',
          parameters: { RangeType: '1', CalendarType: '2' },
        },
      ],
    };

    const xml = await this.fetchXml(settingId, body);
    const flat = this.parseFlat(xml);
    return { count: flat.length, flat };
  }

  /**
   * Fetch, flatten and INSERT new rows for yesterday (shiftDate).
   * - Does NOT overwrite: if rows already exist for (settingId, shiftDate), skip insert.
   */
  async runAndStore(settingId: string) {
    const shiftDateStr = this.yesterdayStr();
    const sid = Number(settingId);

    // If we already have rows for this (setting, shiftDate), do nothing
    const already = await this.repo.count({ where: { settingId: sid, shiftDate: shiftDateStr } });
    if (already > 0) {
      this.logger.log(`report ${sid} for ${shiftDateStr}: already has ${already} rows, skipping insert`);
      return { inserted: 0, count: already, shiftDate: shiftDateStr, skipped: true };
    }

    // fixed body you specified
    const body = {
      company: { short_name: await this.auth['cfg'].get<string>('EMP_API_COMPANY') },
      selectors: [
        {
          name: 'TACounterRecordDate',
          parameters: { RangeType: '1', CalendarType: '2' },
        },
      ],
    };

    // fetch & parse
    const xml = await this.fetchXml(settingId, body);
    const flat = this.parseFlat(xml);
    if (!flat.length) {
      this.logger.warn(`report ${sid} for ${shiftDateStr}: vendor returned 0 rows`);
      return { inserted: 0, count: 0, shiftDate: shiftDateStr };
    }

    // prepare a ONE-D array of partials for bulk insert
    const batchAll: QueryDeepPartialEntity<EmployeeReport>[] = flat.map((r) => ({
      settingId: sid,
      shiftDate: shiftDateStr, // entity should have @Column({ type: 'date' }) shiftDate: string
      department: r.department ?? null,
      employeeId: r.employeeId ?? null,
      firstName: r.firstName ?? null,
      surname: r.surname ?? null,
      hourlyPay: r.hourlyPay ?? null, // currency text
      scheduledTimeHours: r.scheduledTimeHours ?? null,
      annualLeaveDaysDays: r.annualLeaveDaysDays ?? null,
      basicHours: r.basicHours ?? null,
      basicRateTotal: r.basicRateTotal ?? null,
      overtime1Hours: r.overtime1Hours ?? null,
      overtime1Rate: r.overtime1Rate ?? null,
      overtime1Total: r.overtime1Total ?? null,
      overtime2Hours: r.overtime2Hours ?? null,
      overtime2Rate: r.overtime2Rate ?? null,
      overtime2Total: r.overtime2Total ?? null,
      workVsScheduledHours: r.workVsScheduledHours ?? null,
      sickHours: r.sickHours ?? null,
      unauthorisedLeaveHours: r.unauthorisedLeaveHours ?? null,
      holidayPay: r.holidayPay ?? null,
      holidayRate: r.holidayRate ?? null, // currency text
      holidayPayTotal: r.holidayPayTotal ?? null,
      subTotal: r.subTotal ?? null,
      comments: r.comments ?? null,
    }));

    // safe batching (avoid 2100 parameter limit)
    const colCount = this.repo.metadata.columns.length; // rough sizing
    const safeBatch = Math.max(1, Math.floor(2000 / Math.max(1, colCount)));
    let inserted = 0;

    for (let i = 0; i < batchAll.length; i += safeBatch) {
      const batch = batchAll.slice(i, i + safeBatch);
      await this.repo.createQueryBuilder().insert().values(batch).execute();
      inserted += batch.length;
    }

    this.logger.log(`report ${sid} for ${shiftDateStr}: inserted ${inserted} rows`);
    return { inserted, count: flat.length, shiftDate: shiftDateStr };
  }
}

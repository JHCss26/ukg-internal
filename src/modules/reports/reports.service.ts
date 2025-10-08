import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthService } from '../auth/auth.service';
import { XMLParser } from 'fast-xml-parser';
import { EmployeeReport } from './employee-report.entity';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);
  private readonly xml = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' });

  constructor(
    private readonly http: HttpService,
    private readonly auth: AuthService,
    @InjectRepository(EmployeeReport) private readonly repo: Repository<EmployeeReport>,
  ) {}

  private clean(v: any): string | null {
    const s = v == null ? '' : String(v).trim();
    if (!s || s === '-' || s === '—') return null;
    return s;
  }
  private num(v: any): number | null {
    if (v == null || v === '' || v === '-' || v === '—') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
    // we keep currency fields as strings in entity
  }
  private first<T>(x: T | T[] | undefined): T | undefined {
    return Array.isArray(x) ? x[0] : (x as any);
  }

  /** Parse vendor XML -> flat rows (Array of simplified objects) */
  private parseFlat(xml: string) {
    const root = this.xml.parse(xml) as any;
    const result = root?.result ?? root;
    const groups = (result?.body?.group ?? []) as any[];

    // column labels
    let columns: string[] = [];
    const topCols = result?.header?.col;
    if (Array.isArray(topCols)) columns = topCols.map((c: any) => String(c?.label ?? '').trim()).filter(Boolean);

    if (!columns.length && groups.length) {
      const g0Cols = groups[0]?.header?.cols?.col ?? [];
      if (Array.isArray(g0Cols)) columns = g0Cols.map((c: any) => String(c?.label ?? '').trim()).filter(Boolean);
    }
    if (!columns.length) {
      const firstRowCols = this.first(groups)?.body?.row?.[0]?.col ?? [];
      columns = Array(firstRowCols.length).fill(0).map((_, i) => `col${i + 1}`);
    }

    const idx = (label: string) => columns.findIndex(c => c === label);

    const out: Array<Record<string, any>> = [];
    for (const g of groups) {
      // department
      let department: string | null = null;
      const hdrDataCol = g?.header?.data?.col;
      if (hdrDataCol && (hdrDataCol.label ?? '').toLowerCase() === 'default department') {
        department = this.clean(hdrDataCol.data);
      }

      const rows = Array.isArray(g?.body?.row) ? g.body.row : (g?.body?.row ? [g.body.row] : []);
      for (const r of rows) {
        const cols = r?.col ?? [];
        const get = (i: number) => cols[i];

        const row = {
          department,
          employeeId: this.clean(get(idx('Employee ID'))),
          firstName: this.clean(get(idx('First Name'))),
          surname: this.clean(get(idx('Surname'))),
          hourlyPay: this.clean(get(idx('Hourly Pay'))), // keep currency text
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
          holidayRate: this.clean(get(idx('Holiday Rate'))), // keep currency text
          holidayPayTotal: this.num(get(idx('Holiday Pay Total'))),
          subTotal: this.num(get(idx('Sub Total'))),
          comments: this.clean(get(idx('Comments'))),
        };
        out.push(row);
      }
    }
    return out;
  }

  /** Fetch report XML */
  private async fetchXml(settingId: string, body: any) {
    const headers = await this.auth.authHeaders({ Accept: 'application/xml', 'Content-Type': 'application/json' });
    const path = `v1/report/saved/${encodeURIComponent(settingId)}`;
    const res = await firstValueFrom(this.http.post<string>(path, body, { headers, responseType: 'text' as any }));
    return res.data;
  }

  /** Public: fetch & return flat rows only (no DB) */
  async fetchFlat(settingId: string, body: any) {
    const xml = await this.fetchXml(settingId, body);
    const flat = this.parseFlat(xml);
    return { count: flat.length, flat };
  }

  /** Public: fetch, flatten, store into employees_reports */
  async runAndStore(settingId: string, body: any) {
    const xml = await this.fetchXml(settingId, body);
    const flat = this.parseFlat(xml);
    const sid = Number(settingId);

    // delete existing for this setting (keeps table tidy per run)
    await this.repo.createQueryBuilder().delete().where('setting_id = :sid', { sid }).execute();

    if (!flat.length) return { inserted: 0, count: 0 };

    // batch insert safely
    const colCount = this.repo.metadata.columns.length - 2; // exclude PK & createdAt auto column approx
    const safeBatch = Math.max(1, Math.floor(2000 / Math.max(1, colCount))); // defensive
    let inserted = 0;
    for (let i = 0; i < flat.length; i += safeBatch) {
      const chunk = flat.slice(i, i + safeBatch).map(r =>
        this.repo.create({
          settingId: sid,
          department: r.department ?? null,
          employeeId: r.employeeId ?? null,
          firstName: r.firstName ?? null,
          surname: r.surname ?? null,
          hourlyPay: r.hourlyPay ?? null,
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
          holidayRate: r.holidayRate ?? null,
          holidayPayTotal: r.holidayPayTotal ?? null,
          subTotal: r.subTotal ?? null,
          comments: r.comments ?? null,
        }),
      );
      await this.repo
        .createQueryBuilder()
        .insert()
        .values(chunk)
        .execute();
      inserted += chunk.length;
    }

    this.logger.log(`report ${sid}: inserted ${inserted}`);
    return { inserted, count: flat.length };
  }
}

import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { firstValueFrom } from 'rxjs';
import { Repository } from 'typeorm';
import { AuthService } from '../auth/auth.service';
import { Employee } from './employee.entity';

@Injectable()
export class EmployeesService {
  private readonly logger = new Logger(EmployeesService.name);
  constructor(
    private readonly http: HttpService,
    private readonly auth: AuthService,
    @InjectRepository(Employee) private readonly repo: Repository<Employee>,
  ) {}

  private async get<T>(path: string, headers: Record<string, string>) {
    const res = await firstValueFrom(this.http.get<T>(path.replace(/^\//, ''), { headers }));
    return res.data as T;
  }

  async fetchAndStoreAll() {
    const headers = await this.auth.authHeaders();

    // 1) base employees
    const list = await this.get<{ employees: any[] }>('v1/employees', headers);
    const employees = list?.employees ?? [];

    // 2) enrich with pay period profile
    const enriched: Employee[] = [];
    for (const e of employees) {
      const accountId = e.account_id ?? e.external_id ?? e.employee_id ?? e.username;
      let payPeriodProfileName: string | null = null;

      try {
        const details = await this.get<any>(`v1/employees/${encodeURIComponent(accountId)}`, headers);
        payPeriodProfileName = details?.pay_period_profile?.name ?? null;
      } catch (err) {
        this.logger.warn(`payPeriodProfile missing for ${accountId}`);
      }

      enriched.push(this.repo.create({
        accountId: String(accountId),
        username: e.username ?? null,
        // isLocked: e.is_locked ?? null,
        employeeId: e.employee_id ?? null,
        firstName: e.first_name ?? null,
        lastName: e.last_name ?? null,
        fullName: e.full_name ?? null,
        nationalInsurance: e.national_insurance ?? null,
        primaryEmail: e.primary_email ?? null,
        preferredPhone: e.preferred_phone ?? null,
        addressLine1: e.address?.address_line_1 ?? null,
        addressLine2: e.address?.address_line_2 ?? null,
        country: e.address?.country ?? null,
        city: e.address?.city ?? null,
        zip: e.address?.zip ?? null,
        accountStatus: e.account_status ?? null,
        timeZone: e.time_zone ?? null,
        firstScreen: e.first_screen ?? null,
        // hrAddToNewHireExport: e.hr?.add_to_new_hire_export ?? null,
        payPeriodProfileName,
      }));
    }

    // 3) upsert in safe batches
    if (!enriched.length) return { upserted: 0 };
    const cols = Object.keys(this.repo.metadata.propertiesMap).length;
    const safeBatch = Math.max(1, Math.floor(2000 / cols)); // keep safe
    let upserted = 0;
    for (let i = 0; i < enriched.length; i += safeBatch) {
      const chunk = enriched.slice(i, i + safeBatch);
      await this.repo.upsert(chunk, ['accountId']);
      upserted += chunk.length;
    }
    this.logger.log(`employees upserted: ${upserted}`);
    return { upserted };
  }
}

import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

type LoginResponse = { access_token?: string; token?: string; expires_in?: number; expiresIn?: number } | Record<string, any>;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  private readonly apiKey: string;
  private readonly loginPath: string;
  private readonly username: string;
  private readonly password: string;
  private readonly company: string;

  private token: string | null = null;
  private expMs = 0;

  constructor(private readonly http: HttpService, private readonly cfg: ConfigService) {
    const req = (k: string) => {
      console.log(`AuthService: loading env ${k}`);
      const v = this.cfg.getOrThrow<string>(k);
     
      if (!v) throw new Error(`Missing env ${k}`);
      return v;
    };
    this.apiKey = req('EMP_API_KEY');
    this.username = req('EMP_API_USERNAME');
    this.password = req('EMP_API_PASSWORD');
    this.company = req('EMP_API_COMPANY');
    const lp = this.cfg.getOrThrow<string>('EMP_API_LOGIN_PATH') ?? 'v1/login';
    this.loginPath = lp.replace(/^\//, '');
  }

  private baseHeaders() {
    return {
      'api-key': this.apiKey,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };
  }

  private valid() {
    return !!this.token && Date.now() < this.expMs - 3000;
  }

  async login(): Promise<string> {
    const body = { credentials: { username: this.username, password: this.password, company: this.company } };
    const res = await firstValueFrom(this.http.post<LoginResponse>(this.loginPath, body, { headers: this.baseHeaders() }));
    const data = res?.data ?? {};
    const token = (data as any).access_token ?? (data as any).token;
    if (!token) throw new Error(`Login response missing token: ${JSON.stringify(data)}`);
    const exp = Number((data as any).expires_in ?? (data as any).expiresIn ?? 3600);
    this.token = token;
    this.expMs = Date.now() + exp * 1000;
    this.logger.log(`Vendor login ok (ttl ~${exp}s)`);
    return token;
  }

  async getToken(): Promise<string> {
    if (!this.valid()) await this.login();
    return this.token!;
  }

  async authHeaders(overrides?: Record<string, string>) {
    const token = await this.getToken();
    return {
      ...this.baseHeaders(),
      Authorization: `Bearer ${token}`,
      ...overrides,
    };
  }
}

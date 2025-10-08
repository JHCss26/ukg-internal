import { Module, Controller, Get } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthCheckService, HealthCheck, TypeOrmHealthIndicator } from '@nestjs/terminus';

@Controller('health')
class HealthController {
  constructor(private health: HealthCheckService, private orm: TypeOrmHealthIndicator) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([async () => this.orm.pingCheck('mssql', { timeout: 300 })]);
  }
}

@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
})
export class HealthModule {}

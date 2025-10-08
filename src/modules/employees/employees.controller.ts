import { Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { EmployeesService } from './employees.service';

@ApiTags('employees')
@Controller('employees')
export class EmployeesController {
  constructor(private readonly svc: EmployeesService) {}

  @Post('sync')
  @ApiOperation({ summary: 'Fetch vendor employees, enrich, and store in DB' })
  sync() {
    return this.svc.fetchAndStoreAll();
  }
}

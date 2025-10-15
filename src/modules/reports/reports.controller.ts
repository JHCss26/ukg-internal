import { Body, Controller, Param, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { ReportSavedRequestDto } from './dto/report-saved-request.dto';

@ApiTags('reports')
@Controller('reports')
export class ReportsController {
  constructor(private readonly svc: ReportsService) {}

  @Post(':settingId/preview')
  @ApiOperation({ summary: 'Fetch saved report and return a flat array (no DB write)' })
  @ApiBody({ type: ReportSavedRequestDto })
  preview(@Param('settingId') settingId: string, @Body() body: any) {
    return this.svc.fetchFlat(settingId);
  }

  @Post(':settingId/run')
  @ApiOperation({ summary: 'Fetch saved report, flatten, store in DB (employees_reports)' })
  @ApiBody({ type: ReportSavedRequestDto })
  run(@Param('settingId') settingId: string, @Body() body: any) {
    return this.svc.runAndStore(settingId);
  }
}

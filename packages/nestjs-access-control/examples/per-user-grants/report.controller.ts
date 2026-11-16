import { Controller, Get, Param, Post } from '@nestjs/common';

import {
  AccessControlGrant,
  AccessControlReadOne,
} from '@concepta/nestjs-access-control';

const REPORT = {
  id: 'q3',
  title: 'Q3 results',
  revenue: 940000,
  payroll: 410000,
};

@Controller('reports')
export class ReportController {
  @Get(':id')
  @AccessControlReadOne('report')
  one(@Param('id') id: string) {
    return { ...REPORT, id };
  }

  @Post(':id/export')
  @AccessControlGrant({ resource: 'report', action: 'export' })
  export(@Param('id') id: string) {
    return { id, url: `https://files.example.com/reports/${id}.csv` };
  }
}

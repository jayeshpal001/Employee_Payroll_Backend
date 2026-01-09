import { Module } from '@nestjs/common';
import { PayrollController } from './payroll.controller';
import { PayrollService } from './payroll.service';
import { DatabaseService } from '../database/db.service';

@Module({
  controllers: [PayrollController],
  providers: [PayrollService, DatabaseService],
})
export class PayrollModule {}

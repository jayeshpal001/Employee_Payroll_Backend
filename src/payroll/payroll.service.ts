import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/db.service';
import { calculateSalaryStructure, SalaryBreakdown } from './salary-calculator';

// Constants
const TOTAL_DAYS_IN_MONTH = 30;
const FULL_DAY_HOURS = 6.5;
const HALF_DAY_HOURS = 5.0;
const MAX_PAID_LEAVES = 1;

export interface Dataset {
  id: number;
  name: string;
  description: string;
  hoursPerDay: number;
}

@Injectable()
export class PayrollService {
  constructor(private db: DatabaseService) {}

  // API 1: Create Employee
  async createEmployee(name: string, salary: number, isPfEnabled: boolean) {
    if (salary > 30000 && isPfEnabled) {
      throw new Error('PF cannot be enabled for salary greater than ₹30,000');
    }

    await this.ensureTablesExist();

    const result = await this.db.query(
      'INSERT INTO employee (name, salary, is_pf_applicable) VALUES ($1, $2, $3) RETURNING *',
      [name, salary, isPfEnabled],
    );

    const employee = result.rows[0];
    const salaryStructure = calculateSalaryStructure(name, salary, isPfEnabled);

    return { id: employee.id, ...salaryStructure };
  }

  // API 2: Get all employees for dropdown
  async getAllEmployees() {
    const result = await this.db.query(
      'SELECT id, name FROM employee ORDER BY name',
    );
    return result.rows;
  }

  // API 3: Get available datasets for dropdown
  async getAvailableDatasets(): Promise<Dataset[]> {
    return [
      {
        id: 1,
        name: 'Dataset 1',
        description: 'Break every 45 minutes (~9.5 hours/day)',
        hoursPerDay: 9.5,
      },
      {
        id: 2,
        name: 'Dataset 2',
        description: 'Break every 2 hours (8 hours/day)',
        hoursPerDay: 8.0,
      },
      {
        id: 3,
        name: 'Dataset 3',
        description: 'Random breaks (8 hours/day)',
        hoursPerDay: 8.0,
      },
      {
        id: 4,
        name: 'Dataset 4',
        description: 'Half day pattern (5.5 hours/day)',
        hoursPerDay: 5.5,
      },
    ];
  }

  // API 4: Calculate salary based on employee ID and dataset
  async calculateSalaryWithDataset(employeeId: number, datasetId: number) {
    await this.ensureTablesExist();

    const employee = await this.getEmployee(employeeId);
    const dataset = await this.getDataset(datasetId);

    await this.clearTimeLogs(employeeId);
    const timeLogsInserted = await this.generateMonthlyTimeLogs(employeeId, datasetId);

    const attendance = await this.calculateAttendance(employeeId);
    const salaryCalc = this.calculateSalaryWithAttendance(
      parseFloat(employee.salary),
      attendance,
    );

    const salaryStructure = calculateSalaryStructure(
      employee.name,
      salaryCalc.effectiveSalary,
      employee.is_pf_applicable,
    );

    return {
      employee: {
        id: employee.id,
        name: employee.name,
        baseSalary: parseFloat(employee.salary),
        isPfEnabled: employee.is_pf_applicable,
      },
      dataset,
      attendance: {
        month: 'January 2026',
        totalDays: TOTAL_DAYS_IN_MONTH,
        ...attendance,
        timeLogsGenerated: timeLogsInserted,
      },
      salaryCalculation: {
        originalSalary: parseFloat(employee.salary),
        effectiveSalary: salaryCalc.effectiveSalary,
        dailySalary: parseFloat((parseFloat(employee.salary) / 30).toFixed(2)),
        deductionApplied: salaryCalc.deductionApplied,
        deductionAmount: salaryCalc.deductionAmount,
        deductionReason: salaryCalc.deductionReason,
      },
      salaryStructure: {
        ...salaryStructure,
        breakdown: {
          fullDays: attendance.fullDays,
          halfDays: attendance.halfDays,
          absentDays: attendance.absentDays,
          paidLeaves: attendance.paidLeaves,
          unpaidLeaves: attendance.unpaidLeaves,
        },
      },
    };
  }

  // Get employee salary structure by ID
  async getEmployeeSalaryStructure(empId: number): Promise<SalaryBreakdown> {
    const employee = await this.getEmployee(empId);
    return calculateSalaryStructure(
      employee.name,
      parseFloat(employee.salary),
      employee.is_pf_applicable,
    );
  }

  // Private helper methods

  private async getEmployee(employeeId: number) {
    const result = await this.db.query(
      'SELECT id, name, salary, is_pf_applicable FROM employee WHERE id = $1',
      [employeeId],
    );

    if (result.rows.length === 0) {
      throw new Error(`Employee with ID ${employeeId} not found`);
    }

    return result.rows[0];
  }

  private async getDataset(datasetId: number): Promise<Dataset> {
    const datasets = await this.getAvailableDatasets();
    const dataset = datasets.find((d) => d.id === datasetId);

    if (!dataset) {
      throw new Error('Invalid dataset ID. Please select 1, 2, 3, or 4');
    }

    return dataset;
  }

  private async clearTimeLogs(employeeId: number) {
    await this.db.query('DELETE FROM time_log WHERE employee_id = $1', [
      employeeId,
    ]);
  }

  private async ensureTablesExist() {
    try {
      await this.db.query(`
        CREATE TABLE IF NOT EXISTS employee (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          salary DECIMAL(10, 2) NOT NULL,
          is_pf_applicable BOOLEAN NOT NULL DEFAULT false
        )
      `);

      await this.db.query(`DROP TABLE IF EXISTS time_log CASCADE`);

      await this.db.query(`
        CREATE TABLE time_log (
          id SERIAL PRIMARY KEY,
          employee_id INTEGER NOT NULL,
          punch_in_time TIMESTAMP NOT NULL,
          punch_out_time TIMESTAMP NOT NULL,
          FOREIGN KEY (employee_id) REFERENCES employee(id) ON DELETE CASCADE
        )
      `);

      await this.db.query(`
        CREATE INDEX IF NOT EXISTS idx_time_log_employee ON time_log(employee_id)
      `);
    } catch (error) {
      console.error('Error creating tables:', error.message);
    }
  }

  private async generateMonthlyTimeLogs(
    employeeId: number,
    datasetId: number,
  ): Promise<number> {
    const pattern = this.getDatasetPattern(datasetId);
    let totalInserted = 0;

    for (let day = 1; day <= TOTAL_DAYS_IN_MONTH; day++) {
      const dateStr = `2026-01-${day.toString().padStart(2, '0')}`;

      for (const session of pattern) {
        await this.db.query(
          'INSERT INTO time_log (employee_id, punch_in_time, punch_out_time) VALUES ($1, $2, $3)',
          [employeeId, `${dateStr} ${session.start}`, `${dateStr} ${session.end}`],
        );
        totalInserted++;
      }
    }

    return totalInserted;
  }

  private getDatasetPattern(datasetId: number) {
    const patterns = {
      1: [
        { start: '10:00:00', end: '10:45:00' },
        { start: '10:48:00', end: '11:33:00' },
        { start: '11:36:00', end: '12:21:00' },
        { start: '12:24:00', end: '13:09:00' },
        { start: '13:12:00', end: '13:57:00' },
        { start: '14:00:00', end: '14:45:00' },
        { start: '14:48:00', end: '15:33:00' },
        { start: '15:36:00', end: '16:21:00' },
        { start: '16:24:00', end: '17:09:00' },
        { start: '17:12:00', end: '17:57:00' },
        { start: '18:00:00', end: '18:45:00' },
        { start: '18:48:00', end: '19:33:00' },
      ],
      2: [
        { start: '10:00:00', end: '12:00:00' },
        { start: '12:05:00', end: '14:05:00' },
        { start: '14:10:00', end: '16:10:00' },
        { start: '16:15:00', end: '18:15:00' },
      ],
      3: [
        { start: '10:00:00', end: '11:20:00' },
        { start: '11:30:00', end: '12:50:00' },
        { start: '13:10:00', end: '14:40:00' },
        { start: '14:55:00', end: '16:10:00' },
        { start: '16:20:00', end: '18:00:00' },
      ],
      4: [
        { start: '10:00:00', end: '11:50:00' },
        { start: '12:00:00', end: '13:50:00' },
        { start: '14:00:00', end: '15:50:00' },
      ],
    };

    return patterns[datasetId] || patterns[1];
  }

  private async calculateAttendance(employeeId: number) {
    const result = await this.db.query(
      `SELECT 
        DATE(punch_in_time) as work_date,
        SUM(EXTRACT(EPOCH FROM (punch_out_time - punch_in_time))/3600) as daily_hours
      FROM time_log 
      WHERE employee_id = $1
      GROUP BY DATE(punch_in_time)
      ORDER BY work_date`,
      [employeeId],
    );

    let fullDays = 0;
    let halfDays = 0;
    let totalHoursWorked = 0;

    result.rows.forEach((day) => {
      const hours = parseFloat(day.daily_hours);
      totalHoursWorked += hours;

      if (hours >= FULL_DAY_HOURS) {
        fullDays++;
      } else if (hours >= HALF_DAY_HOURS) {
        halfDays++;
      }
    });

    const daysWithLogs = result.rows.length;
    const daysWithLessThan5Hours = daysWithLogs - (fullDays + halfDays);
    const daysNotLogged = TOTAL_DAYS_IN_MONTH - daysWithLogs;
    const absentDays = daysNotLogged + daysWithLessThan5Hours;

    const paidLeaves = Math.min(absentDays, MAX_PAID_LEAVES);
    const unpaidLeaves = Math.max(absentDays - MAX_PAID_LEAVES, 0);

    return {
      totalHoursWorked: parseFloat(totalHoursWorked.toFixed(2)),
      attendedDays: fullDays + halfDays,
      fullDays,
      halfDays,
      absentDays,
      paidLeaves,
      unpaidLeaves,
      averageHoursPerDay: parseFloat((totalHoursWorked / daysWithLogs || 0).toFixed(2)),
    };
  }

  private calculateSalaryWithAttendance(baseSalary: number, attendance: any) {
    const dailySalary = baseSalary / 30;

    const fullDaysPay = attendance.fullDays * dailySalary;
    const halfDaysPay = attendance.halfDays * (dailySalary / 2);
    const paidLeavesPay = attendance.paidLeaves * dailySalary;

    const effectiveSalary = fullDaysPay + halfDaysPay + paidLeavesPay;
    const deductionAmount = baseSalary - effectiveSalary;
    const deductionApplied = deductionAmount > 0;

    let deductionReason: string | null = null;
    if (deductionApplied) {
      const reasons: string[] = [];
      if (attendance.halfDays > 0) {
        reasons.push(`${attendance.halfDays} half day(s)`);
      }
      if (attendance.unpaidLeaves > 0) {
        reasons.push(`${attendance.unpaidLeaves} unpaid leave(s)`);
      }
      if (reasons.length > 0) {
        deductionReason = `Deduction for: ${reasons.join(', ')}`;
      }
    }

    return {
      effectiveSalary: parseFloat(effectiveSalary.toFixed(2)),
      deductionAmount: parseFloat(deductionAmount.toFixed(2)),
      deductionApplied,
      deductionReason,
    };
  }
}

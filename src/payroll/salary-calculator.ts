// Constants
const MAX_PF = 2880;
const PT_AMOUNT = 200;
const PF_PERCENTAGE = 0.24;
const BASE_PERCENTAGE = 0.40;
const HRA_PERCENTAGE = 0.40;
const TA_PERCENTAGE = 0.10;
const DA_PERCENTAGE = 0.15;

export interface SalaryBreakdown {
  employeeName: string;
  salary: number;
  isPfEnabled: boolean;
  baseSalary: number;
  hra: number;
  ta: number;
  da: number;
  pf: number;
  pt: number;
  bonus: number;
  netPay: number;
}

/**
 * Calculate salary structure based on salary amount and PF status
 * 
 * New Calculation Logic:
 * 1. Base Salary = 40% of total salary
 * 2. HRA = 40% of base salary
 * 3. TA = 10% of base salary
 * 4. DA = 15% of base salary
 * 5. Bonus = Salary - (Base + HRA + TA + DA)
 * 6. PF = 24% of base salary (capped at ₹2,880) - only if enabled and salary <= 30000
 * 7. PT = ₹200 (fixed) - only if salary >= 12000
 * 8. Net Pay = (Base + HRA + TA + DA + Bonus) - (PF + PT)
 * 
 * Rules:
 * 1. Salary > 30000: No PF, PT applicable
 * 2. Salary 12000-30000: PF (if enabled) + PT applicable
 * 3. Salary < 12000: Only PF (if enabled), no PT, no structure breakdown
 */
export function calculateSalaryStructure(
  employeeName: string,
  salary: number,
  isPfEnabled: boolean,
): SalaryBreakdown {
  let pf = 0;
  let pt = 0;
  let baseSalary = 0;
  let hra = 0;
  let ta = 0;
  let da = 0;
  let bonus = 0;
  let netPay = salary;

  if (salary >= 12000) {
    // Calculate salary structure for salary >= 12000
    baseSalary = salary * BASE_PERCENTAGE;
    hra = baseSalary * HRA_PERCENTAGE;
    ta = baseSalary * TA_PERCENTAGE;
    da = baseSalary * DA_PERCENTAGE;
    bonus = salary - (baseSalary + hra + ta + da);

    // PF calculation: 24% of base salary (only if enabled and salary <= 30000)
    if (isPfEnabled && salary <= 30000) {
      pf = Math.min(baseSalary * PF_PERCENTAGE, MAX_PF);
    }

    // PT: ₹200 for all salaries >= 12000
    pt = PT_AMOUNT;

    // Net Pay = Gross - Deductions
    const grossPay = baseSalary + hra + ta + da + bonus;
    netPay = grossPay - pf - pt;
  } 
  else {
    // Low salary (< 12000): Only PF (if enabled), no structure breakdown
    if (isPfEnabled) {
      baseSalary = salary * BASE_PERCENTAGE;
      pf = Math.min(baseSalary * PF_PERCENTAGE, MAX_PF);
      netPay = salary - pf;
    }
  }

  return {
    employeeName,
    salary,
    isPfEnabled,
    baseSalary: parseFloat(baseSalary.toFixed(2)),
    hra: parseFloat(hra.toFixed(2)),
    ta: parseFloat(ta.toFixed(2)),
    da: parseFloat(da.toFixed(2)),
    pf: parseFloat(pf.toFixed(2)),
    pt: parseFloat(pt.toFixed(2)),
    bonus: parseFloat(bonus.toFixed(2)),
    netPay: parseFloat(netPay.toFixed(2)),
  };
}

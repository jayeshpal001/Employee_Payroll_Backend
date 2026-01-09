# Employee Payroll System - Backend

A NestJS-based payroll system with automatic attendance tracking and salary calculation.

## Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Create `.env` file:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=payroll_db
DB_USER=postgres
DB_PASSWORD=your_password
PORT=3000
```

### 3. Create Database
```bash
psql -U postgres
CREATE DATABASE payroll_db;
\q
```

**Note:** Tables are created automatically on first API call.

### 4. Run Server
```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod
```

## API Endpoints

### 1. POST /employee
Create a new employee.

**Request:**
```json
{
  "name": "John Doe",
  "salary": 25000,
  "isPfEnabled": true
}
```

**Response:**
```json
{
  "id": 1,
  "employeeName": "John Doe",
  "salary": 25000,
  "isPfEnabled": true,
  "baseSalary": 5968,
  "hra": 2387.2,
  "ta": 596.8,
  "da": 895.2,
  "pf": 2880,
  "pt": 200,
  "bonus": 5072.8,
  "netPay": 14920
}
```

### 2. GET /employees
Get all employees for dropdown.

**Response:**
```json
[
  { "id": 1, "name": "John Doe" },
  { "id": 2, "name": "Jane Smith" }
]
```

### 3. GET /datasets
Get available datasets for dropdown.

**Response:**
```json
[
  {
    "id": 1,
    "name": "Dataset 1",
    "description": "Break every 45 minutes for 3 minutes (~9.5 hours/day)",
    "hoursPerDay": 9.5
  },
  ...
]
```

### 4. POST /calculate-salary
Calculate salary based on employee and dataset.

**Request:**
```json
{
  "employeeId": 1,
  "datasetId": 1
}
```

**Response:**
```json
{
  "employee": {
    "id": 1,
    "name": "John Doe",
    "baseSalary": 25000,
    "isPfEnabled": true
  },
  "dataset": {
    "id": 1,
    "name": "Dataset 1",
    "description": "...",
    "hoursPerDay": 9.5
  },
  "attendance": {
    "month": "January 2026",
    "totalDays": 30,
    "totalHoursWorked": 285,
    "attendedDays": 30,
    "fullDays": 30,
    "halfDays": 0,
    "absentDays": 0,
    "paidLeaves": 0,
    "unpaidLeaves": 0,
    "averageHoursPerDay": 9.5,
    "timeLogsGenerated": 360
  },
  "salaryCalculation": {
    "originalSalary": 25000,
    "effectiveSalary": 25000,
    "dailySalary": 833.33,
    "deductionApplied": false,
    "deductionAmount": 0,
    "deductionReason": null
  },
  "salaryStructure": {
    "employeeName": "John Doe",
    "salary": 25000,
    "isPfEnabled": true,
    "baseSalary": 5968,
    "hra": 2387.2,
    "ta": 596.8,
    "da": 895.2,
    "pf": 2880,
    "pt": 200,
    "bonus": 5072.8,
    "netPay": 14920,
    "breakdown": {
      "fullDays": 30,
      "halfDays": 0,
      "absentDays": 0,
      "paidLeaves": 0,
      "unpaidLeaves": 0
    }
  }
}
```

## Salary Calculation Rules

### PF (Provident Fund)
- Applicable for salary ≤ ₹30,000
- 24% of salary (max ₹2,880)
- Deducted first before other calculations

### PT (Professional Tax)
- ₹200 for salary ≥ ₹12,000
- ₹0 for salary < ₹12,000
- Deducted after PF

### Salary Structure
- **Base Salary**: 40% of remaining amount
- **HRA**: 40% of base salary
- **TA**: 10% of base salary
- **DA**: 15% of base salary
- **Bonus**: Remaining amount

### Attendance Rules
- **Full Day**: ≥ 6.5 hours → Full day salary
- **Half Day**: 5-6.4 hours → 50% day salary
- **Absent**: < 5 hours → No salary
- **Paid Leave**: Max 1 per month
- **Unpaid Leave**: Deducted from salary (salary/30 per day)

## Project Structure

```
Backend/
├── src/
│   ├── database/
│   │   └── db.service.ts          # PostgreSQL connection
│   ├── payroll/
│   │   ├── payroll.controller.ts  # API endpoints
│   │   ├── payroll.service.ts     # Business logic
│   │   ├── payroll.module.ts      # Module definition
│   │   └── salary-calculator.ts   # Salary calculation
│   ├── app.module.ts
│   └── main.ts
├── .env                            # Environment config
├── database-schema.sql             # Database schema (auto-created)
└── package.json
```

## Database Schema

### employee
- id (SERIAL PRIMARY KEY)
- name (VARCHAR)
- salary (DECIMAL)
- is_pf_applicable (BOOLEAN)

### time_log
- id (SERIAL PRIMARY KEY)
- employee_id (INTEGER)
- punch_in_time (TIMESTAMP)
- punch_out_time (TIMESTAMP)

**Note:** Tables are automatically created on first API call.

## Testing

Use the Postman collection in the root directory:
`Payroll-APIs.postman_collection.json`

## Tech Stack

- NestJS 11
- TypeScript 5
- PostgreSQL 14+
- Node.js 18+

## License

MIT

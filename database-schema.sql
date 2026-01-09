-- Database Schema for Employee Payroll System

-- Create employee table
CREATE TABLE IF NOT EXISTS employee (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    salary DECIMAL(10, 2) NOT NULL,
    is_pf_applicable BOOLEAN NOT NULL DEFAULT false
);

-- Create time_log table for attendance tracking
CREATE TABLE IF NOT EXISTS time_log (
    id SERIAL PRIMARY KEY,
    punch_in_time TIMESTAMP NOT NULL,
    punch_out_time TIMESTAMP NOT NULL,
    employee_id INTEGER NOT NULL,
    FOREIGN KEY (employee_id) REFERENCES employee(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_employee_name ON employee(name);
CREATE INDEX IF NOT EXISTS idx_time_log_employee ON time_log(employee_id);
CREATE INDEX IF NOT EXISTS idx_time_log_times ON time_log(punch_in_time, punch_out_time);

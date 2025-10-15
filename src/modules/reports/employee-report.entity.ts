import { Column, Entity, PrimaryGeneratedColumn, Index, CreateDateColumn } from 'typeorm';

@Entity({ name: 'employees_reports' }) // your table name
@Index(['settingId'])
export class EmployeeReport {
  @PrimaryGeneratedColumn({ name: 'id', type: 'int' })
  id!: number;

  @Column({name:'shift_date', type: 'date' })
  shiftDate!: string;

  @Column({ name: 'setting_id', type: 'int' })
  settingId!: number;

  @Column({ name: 'department', type: 'nvarchar', length: 200, nullable: true })
  department!: string | null;

  @Column({ name: 'employee_id', type: 'nvarchar', length: 100, nullable: true })
  employeeId!: string | null;

  @Column({ name: 'first_name', type: 'nvarchar', length: 200, nullable: true })
  firstName!: string | null;

  @Column({ name: 'surname', type: 'nvarchar', length: 200, nullable: true })
  surname!: string | null;

  @Column({ name: 'hourly_pay', type: 'nvarchar', length: 50, nullable: true })
  hourlyPay!: string | null; // keep currency text like "£13.20"

  @Column({ name: 'scheduled_time_hours', type: 'float', nullable: true })
  scheduledTimeHours!: number | null;

  @Column({ name: 'annual_leave_days_days', type: 'float', nullable: true })
  annualLeaveDaysDays!: number | null;

  @Column({ name: 'basic_hours', type: 'float', nullable: true })
  basicHours!: number | null;

  @Column({ name: 'basic_rate_total', type: 'float', nullable: true })
  basicRateTotal!: number | null;

  @Column({ name: 'overtime1_hours', type: 'float', nullable: true })
  overtime1Hours!: number | null;

  @Column({ name: 'overtime1_rate', type: 'float', nullable: true })
  overtime1Rate!: number | null;

  @Column({ name: 'overtime1_total', type: 'float', nullable: true })
  overtime1Total!: number | null;

  @Column({ name: 'overtime2_hours', type: 'float', nullable: true })
  overtime2Hours!: number | null;

  @Column({ name: 'overtime2_rate', type: 'float', nullable: true })
  overtime2Rate!: number | null;

  @Column({ name: 'overtime2_total', type: 'float', nullable: true })
  overtime2Total!: number | null;

  @Column({ name: 'work_vs_scheduled_hours', type: 'float', nullable: true })
  workVsScheduledHours!: number | null;

  @Column({ name: 'sick_hours', type: 'float', nullable: true })
  sickHours!: number | null;

  @Column({ name: 'unauthorised_leave_hours', type: 'float', nullable: true })
  unauthorisedLeaveHours!: number | null;

  @Column({ name: 'holiday_pay', type: 'float', nullable: true })
  holidayPay!: number | null;

  @Column({ name: 'holiday_rate', type: 'nvarchar', length: 50, nullable: true })
  holidayRate!: string | null; // keep currency text

  @Column({ name: 'holiday_pay_total', type: 'float', nullable: true })
  holidayPayTotal!: number | null;

  @Column({ name: 'sub_total', type: 'float', nullable: true })
  subTotal!: number | null;

  @Column({ name: 'comments', type: 'nvarchar', length: 1000, nullable: true })
  comments!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime2', default: () => 'SYSUTCDATETIME()' })
  createdAt!: Date;
}

import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'employees' }) // change to your table name if different
export class Employee {
  @PrimaryColumn({ name: 'account_id', type: 'nvarchar', length: 50 })
  accountId!: string;

  @Column({ name: 'username', type: 'nvarchar', length: 200, nullable: true })
  username!: string | null;

  // @Column({ name: 'is_locked', type: 'bit', nullable: true })
  // isLocked!: boolean | null;

  @Column({ name: 'employee_id', type: 'nvarchar', length: 100, nullable: true })
  employeeId!: string | null;

  @Column({ name: 'first_name', type: 'nvarchar', length: 200, nullable: true })
  firstName!: string | null;

  @Column({ name: 'last_name', type: 'nvarchar', length: 200, nullable: true })
  lastName!: string | null;

  @Column({ name: 'full_name', type: 'nvarchar', length: 400, nullable: true })
  fullName!: string | null;

  @Column({ name: 'national_insurance', type: 'nvarchar', length: 50, nullable: true })
  nationalInsurance!: string | null;

  @Column({ name: 'primary_email', type: 'nvarchar', length: 320, nullable: true })
  primaryEmail!: string | null;

  @Column({ name: 'preferred_phone', type: 'nvarchar', length: 50, nullable: true })
  preferredPhone!: string | null;

  @Column({ name: 'address_line_1', type: 'nvarchar', length: 250, nullable: true })
  addressLine1!: string | null;

  @Column({ name: 'address_line_2', type: 'nvarchar', length: 250, nullable: true })
  addressLine2!: string | null;

  @Column({ name: 'country', type: 'nvarchar', length: 50, nullable: true })
  country!: string | null;

  @Column({ name: 'city', type: 'nvarchar', length: 150, nullable: true })
  city!: string | null;

  @Column({ name: 'zip', type: 'nvarchar', length: 20, nullable: true })
  zip!: string | null;

  @Column({ name: 'account_status', type: 'nvarchar', length: 50, nullable: true })
  accountStatus!: string | null;

  @Column({ name: 'time_zone', type: 'nvarchar', length: 100, nullable: true })
  timeZone!: string | null;

  @Column({ name: 'first_screen', type: 'nvarchar', length: 200, nullable: true })
  firstScreen!: string | null;

  // @Column({ name: 'hr_add_to_new_hire_export', type: 'bit', nullable: true })
  // hrAddToNewHireExport!: boolean | null;

  @Column({ name: 'pay_period_profile_name', type: 'nvarchar', length: 200, nullable: true })
  payPeriodProfileName!: string | null;

  @Column({ name: 'updated_at', type: 'datetime2', default: () => 'SYSUTCDATETIME()' })
  updatedAt!: Date;
}

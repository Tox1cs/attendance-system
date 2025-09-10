import datetime
from django.utils import timezone
from django.core.management.base import BaseCommand
from attendance.models import (
    Employee, RawAttendanceLog, DailyAttendanceReport, WorkShift, 
    OvertimeRequest, LeaveRequest, Holiday, ShiftDayRule, MissionRequest
)
from django.db.models import Min, Max
from django.core.exceptions import ObjectDoesNotExist

class Command(BaseCommand):
    help = 'Processes logs considering Holidays, Weekends, Leave, Missions, and Overtime'

    def handle(self, *args, **options):
        
        today = timezone.localdate()
        
        holiday_today = Holiday.objects.filter(date=today).first()
        
        if holiday_today:
            self.stdout.write(self.style.WARNING(f"Processing {today} as OFFICIAL HOLIDAY: {holiday_today.name}"))
            self.process_off_day_logic(today, is_holiday=True)
        else:
            self.stdout.write(self.style.SUCCESS(f"Processing {today} as NON-Holiday. Checking dynamic shifts..."))
            self.process_shift_based_logic(today)

    
    def process_off_day_logic(self, today, is_holiday=False, is_weekend=False):
        employees = Employee.objects.filter(shift__isnull=False)
        for emp in employees:
            logs_today = RawAttendanceLog.objects.filter(employee_code=emp.employee_code, timestamp__date=today)

            if not logs_today.exists():
                continue

            first_log = logs_today.earliest('timestamp')
            last_log = logs_today.latest('timestamp')
            total_presence_duration = last_log.timestamp - first_log.timestamp
            total_worked_minutes = int(total_presence_duration.total_seconds() / 60)

            has_ot_approval = OvertimeRequest.objects.filter(
                employee=emp, date=today, status=OvertimeRequest.STATUS_APPROVED
            ).exists()
            
            final_overtime = 0
            if has_ot_approval:
                final_overtime = total_worked_minutes
            
            DailyAttendanceReport.objects.update_or_create(
                employee=emp, date=today,
                defaults={
                    'first_check_in': first_log.timestamp.time(), 
                    'last_check_out': last_log.timestamp.time(),
                    'total_lateness_minutes': 0, 'penalty_minutes': 0,
                    'required_work_minutes_today': 0,
                    'total_worked_minutes': total_worked_minutes,
                    'work_shortfall_minutes': 0,
                    'work_overtime_minutes': final_overtime
                }
            )
            if is_holiday:
                 self.stdout.write(f"Processed Holiday Work for {emp.full_name}. OT: {final_overtime}m")
            if is_weekend:
                 self.stdout.write(f"Processed Weekend Work for {emp.full_name}. OT: {final_overtime}m")


    def process_shift_based_logic(self, today):
        today_weekday_num = today.weekday()
        employees = Employee.objects.filter(shift__isnull=False)
        
        for emp in employees:
            shift = emp.shift
            if not shift: continue

            try:
                day_rule = ShiftDayRule.objects.get(shift=shift, day_of_week=today_weekday_num)
            except ObjectDoesNotExist:
                self.stdout.write(self.style.ERROR(f"FATAL: No ShiftDayRule defined for {shift.name} on day {today_weekday_num}. Skipping {emp.full_name}."))
                continue

            if not day_rule.is_work_day:
                self.stdout.write(self.style.WARNING(f"Day is WEEKEND for {emp.full_name} (Rule: {day_rule})."))
                self.process_off_day_logic(today, is_weekend=True)
                continue

            self.stdout.write(self.style.SUCCESS(f"Day is NORMAL WORK DAY for {emp.full_name}. Running calc with rule: {day_rule}"))
            self.run_full_calculation(emp, shift, today, day_rule)


    def run_full_calculation(self, emp, shift, today, day_rule):
        has_full_day_leave = LeaveRequest.objects.filter(
            employee=emp, date=today, status=LeaveRequest.STATUS_APPROVED, leave_type=LeaveRequest.TYPE_FULL_DAY
        ).exists()
        
        if has_full_day_leave:
            self.stdout.write(f'Skipping calculation for {emp.full_name} (On Full Leave).')
            return

        has_full_day_mission = MissionRequest.objects.filter(
            employee=emp, date=today, status=MissionRequest.STATUS_APPROVED, mission_type=MissionRequest.TYPE_FULL_DAY
        ).exists()

        if has_full_day_mission:
            self.stdout.write(f'Processing {emp.full_name} as Full Day Mission.')
            DailyAttendanceReport.objects.update_or_create(
                employee=emp, date=today,
                defaults={
                    'total_worked_minutes': day_rule.required_work_minutes,
                    'required_work_minutes_today': day_rule.required_work_minutes,
                    'work_shortfall_minutes': 0, 'work_overtime_minutes': 0,
                    'total_lateness_minutes': 0, 'penalty_minutes': 0
                }
            )
            return

        logs_today = RawAttendanceLog.objects.filter(employee_code=emp.employee_code, timestamp__date=today).order_by('timestamp')
        
        if not logs_today.exists():
            self.stdout.write(f'No logs found for {emp.full_name} (Absent)')
            DailyAttendanceReport.objects.update_or_create(
                employee=emp, date=today,
                defaults={
                    'work_shortfall_minutes': day_rule.required_work_minutes, 
                    'required_work_minutes_today': day_rule.required_work_minutes,
                    'first_check_in': None, 'last_check_out': None,
                }
            )
            return

        first_log = logs_today.first()
        last_log = logs_today.last()
        first_check_in_time = first_log.timestamp.time()
        last_check_out_time = last_log.timestamp.time()
        
        shift_start_minutes = (day_rule.start_time.hour * 60) + day_rule.start_time.minute
        grace_deadline_minutes = shift_start_minutes + day_rule.grace_period_minutes
        arrival_time_minutes = (first_check_in_time.hour * 60) + first_check_in_time.minute
        
        total_lateness_minutes = 0
        penalty_minutes = 0
        if arrival_time_minutes > shift_start_minutes:
            total_lateness_minutes = arrival_time_minutes - shift_start_minutes
        if arrival_time_minutes > grace_deadline_minutes:
            penalty_minutes = float(total_lateness_minutes) * float(day_rule.penalty_rate)
        
        approved_hourly_leave_minutes = 0
        hourly_leave_req = LeaveRequest.objects.filter(
            employee=emp, date=today, status=LeaveRequest.STATUS_APPROVED, leave_type=LeaveRequest.TYPE_HOURLY
        ).first()
        if hourly_leave_req:
            approved_hourly_leave_minutes = hourly_leave_req.requested_minutes
        
        total_physical_presence = 0
        if len(logs_today) >= 2:
            log_pairs = zip(logs_today[::2], logs_today[1::2])
            for log_in, log_out in log_pairs:
                duration = log_out.timestamp - log_in.timestamp
                total_physical_presence += int(duration.total_seconds() / 60)

        approved_hourly_mission_minutes = 0
        hourly_mission_req = MissionRequest.objects.filter(
            employee=emp, date=today, status=MissionRequest.STATUS_APPROVED, mission_type=MissionRequest.TYPE_HOURLY
        ).first()
        if hourly_mission_req and hourly_mission_req.start_time and hourly_mission_req.end_time:
            dummy_date = datetime.date.min
            start_dt = datetime.datetime.combine(dummy_date, hourly_mission_req.start_time)
            end_dt = datetime.datetime.combine(dummy_date, hourly_mission_req.end_time)
            duration = end_dt - start_dt
            approved_hourly_mission_minutes = int(duration.total_seconds() / 60)

        total_worked_minutes = total_physical_presence + approved_hourly_mission_minutes
        
        day_required_minutes = float(day_rule.required_work_minutes)
        final_required_minutes = day_required_minutes + penalty_minutes - approved_hourly_leave_minutes
        
        work_balance_minutes = total_worked_minutes - final_required_minutes
        
        work_shortfall_minutes = 0
        work_overtime_minutes = 0
        if work_balance_minutes < 0:
            work_shortfall_minutes = abs(work_balance_minutes)
        elif work_balance_minutes > 0:
            has_ot_approval = OvertimeRequest.objects.filter(
                employee=emp, date=today, status=OvertimeRequest.STATUS_APPROVED
            ).exists()
            if has_ot_approval:
                work_overtime_minutes = work_balance_minutes
        
        DailyAttendanceReport.objects.update_or_create(
            employee=emp,
            date=today,
            defaults={
                'first_check_in': first_check_in_time, 'last_check_out': last_check_out_time,
                'total_lateness_minutes': total_lateness_minutes, 'penalty_minutes': penalty_minutes,
                'required_work_minutes_today': final_required_minutes,
                'total_worked_minutes': total_worked_minutes,
                'work_shortfall_minutes': work_shortfall_minutes,
                'work_overtime_minutes': work_overtime_minutes
            }
        )
        
        self.stdout.write(self.style.SUCCESS(f'Successfully processed NORMAL report for {emp.full_name}'))
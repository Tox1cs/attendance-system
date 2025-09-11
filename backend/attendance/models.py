from django.db import models
from django.contrib.auth.models import User
import datetime

class GlobalSettings(models.Model):
    grace_period_minutes = models.IntegerField(default=90)
    penalty_rate = models.DecimalField(default=1.4, max_digits=3, decimal_places=2)
    
    def __str__(self):
        return "Company-Wide Settings"
    class Meta:
        verbose_name_plural = "Global Settings"

class WorkShift(models.Model):
    name = models.CharField(max_length=100, unique=True)
    def __str__(self): return self.name

class ShiftDayRule(models.Model):
    DAY_CHOICES = [(0, 'Monday'),(1, 'Tuesday'),(2, 'Wednesday'),(3, 'Thursday'),(4, 'Friday'),(5, 'Saturday'),(6, 'Sunday')]
    shift = models.ForeignKey(WorkShift, on_delete=models.CASCADE, related_name='day_rules')
    day_of_week = models.IntegerField(choices=DAY_CHOICES)
    is_work_day = models.BooleanField(default=False)
    start_time = models.TimeField(default=datetime.time(8, 0))
    end_time = models.TimeField(default=datetime.time(16, 45))
    required_work_minutes = models.IntegerField(default=525)
    class Meta: unique_together = ('shift', 'day_of_week'); ordering = ['day_of_week']
    def __str__(self): return f"{self.shift.name} - {self.get_day_of_week_display()}"

class Employee(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, null=True, blank=True)
    full_name = models.CharField(max_length=200)
    employee_code = models.CharField(max_length=50, unique=True)
    shift = models.ForeignKey(WorkShift, on_delete=models.SET_NULL, null=True, blank=True)
    def __str__(self): return self.full_name

class OvertimeRequest(models.Model):
    STATUS_PENDING = 'PENDING'; STATUS_APPROVED = 'APPROVED'; STATUS_REJECTED = 'REJECTED'
    STATUS_CHOICES = [(STATUS_PENDING, 'Pending'), (STATUS_APPROVED, 'Approved'), (STATUS_REJECTED, 'Rejected')]
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE)
    date = models.DateField()
    requested_minutes = models.IntegerField(default=0)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default=STATUS_PENDING)
    class Meta: unique_together = ('employee', 'date')
    def __str__(self): return f"{self.employee.full_name} on {self.date} - Status: {self.get_status_display()}"

class RawAttendanceLog(models.Model):
    employee_code = models.CharField(max_length=50)
    timestamp = models.DateTimeField()

class DailyAttendanceReport(models.Model):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE)
    date = models.DateField()
    first_check_in = models.TimeField(null=True, blank=True); last_check_out = models.TimeField(null=True, blank=True)
    total_lateness_minutes = models.IntegerField(default=0); penalty_minutes = models.FloatField(default=0)
    required_work_minutes_today = models.FloatField(default=525); total_worked_minutes = models.IntegerField(default=0)
    work_shortfall_minutes = models.IntegerField(default=0); work_overtime_minutes = models.IntegerField(default=0)
    class Meta: unique_together = ('employee', 'date')

class LeaveRequest(models.Model):
    STATUS_PENDING = 'PENDING'; STATUS_APPROVED = 'APPROVED'; STATUS_REJECTED = 'REJECTED'
    STATUS_CHOICES = [(STATUS_PENDING, 'Pending'), (STATUS_APPROVED, 'Approved'), (STATUS_REJECTED, 'Rejected')]
    TYPE_FULL_DAY = 'FULL_DAY'; TYPE_HOURLY = 'HOURLY'
    LEAVE_TYPE_CHOICES = [(TYPE_FULL_DAY, 'Full-Day Leave'), (TYPE_HOURLY, 'Hourly Leave')]
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE)
    date = models.DateField()
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default=STATUS_PENDING)
    leave_type = models.CharField(max_length=10, choices=LEAVE_TYPE_CHOICES)
    requested_minutes = models.IntegerField(default=0, help_text="Duration in minutes for hourly leave")
    reason = models.TextField(blank=True, null=True)
    class Meta: unique_together = ('employee', 'date')
    def __str__(self): return f"{self.employee.full_name} on {self.date} ({self.get_leave_type_display()}) - {self.get_status_display()}"

class Holiday(models.Model):
    date = models.DateField(unique=True)
    name = models.CharField(max_length=255)
    def __str__(self): return f"{self.date} - {self.name}"
    class Meta: ordering = ['date']

class MissionRequest(models.Model):
    STATUS_PENDING = 'PENDING'; STATUS_APPROVED = 'APPROVED'; STATUS_REJECTED = 'REJECTED'
    STATUS_CHOICES = [(STATUS_PENDING, 'Pending'), (STATUS_APPROVED, 'Approved'), (STATUS_REJECTED, 'Rejected')]
    TYPE_FULL_DAY = 'FULL_DAY'; TYPE_HOURLY = 'HOURLY'
    MISSION_TYPE_CHOICES = [(TYPE_FULL_DAY, 'Full-Day Mission'), (TYPE_HOURLY, 'Hourly Mission')]
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE)
    date = models.DateField()
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default=STATUS_PENDING)
    mission_type = models.CharField(max_length=10, choices=MISSION_TYPE_CHOICES)
    start_time = models.TimeField(null=True, blank=True, help_text="Start time for hourly mission")
    end_time = models.TimeField(null=True, blank=True, help_text="End time for hourly mission")
    destination = models.CharField(max_length=255, blank=True, null=True)
    reason = models.TextField(blank=True, null=True)
    class Meta: unique_together = ('employee', 'date')
    def __str__(self): return f"{self.employee.full_name} on {self.date} ({self.get_mission_type_display()}) - {self.get_status_display()}"

class ManualLogRequest(models.Model):
    STATUS_PENDING = 'PENDING'; STATUS_APPROVED = 'APPROVED'; STATUS_REJECTED = 'REJECTED'
    STATUS_CHOICES = [(STATUS_PENDING, 'Pending'), (STATUS_APPROVED, 'Approved'), (STATUS_REJECTED, 'Rejected')]
    LOG_TYPE_IN = 'IN'; LOG_TYPE_OUT = 'OUT'
    LOG_TYPE_CHOICES = [(LOG_TYPE_IN, 'Clock In'), (LOG_TYPE_OUT, 'Clock Out')]
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE)
    date = models.DateField()
    time = models.TimeField()
    log_type = models.CharField(max_length=3, choices=LOG_TYPE_CHOICES)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default=STATUS_PENDING)
    reason = models.TextField(blank=True, null=True)
    def __str__(self): return f"{self.employee.full_name} - {self.date} @ {self.time} ({self.get_log_type_display()}) - {self.get_status_display()}"
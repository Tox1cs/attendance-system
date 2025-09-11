from django.contrib import admin
from .models import (
    WorkShift, 
    ShiftDayRule,
    Employee, 
    RawAttendanceLog, 
    DailyAttendanceReport, 
    OvertimeRequest, 
    LeaveRequest,
    Holiday,
    MissionRequest,
    ManualLogRequest,
    GlobalSettings
)

class ShiftDayRuleInline(admin.TabularInline):
    model = ShiftDayRule
    extra = 7
    max_num = 7
    fields = ('day_of_week', 'is_work_day', 'start_time', 'end_time', 'required_work_minutes')
    ordering = ('day_of_week',)

@admin.register(WorkShift)
class WorkShiftAdmin(admin.ModelAdmin):
    list_display = ('name',)
    inlines = [ShiftDayRuleInline]

@admin.register(Holiday)
class HolidayAdmin(admin.ModelAdmin):
    list_display = ('date', 'name')
    search_fields = ('name', 'date')
    list_filter = ('date',)

admin.site.register(Employee)
admin.site.register(RawAttendanceLog)
admin.site.register(DailyAttendanceReport)
admin.site.register(OvertimeRequest)
admin.site.register(LeaveRequest)
admin.site.register(MissionRequest)
admin.site.register(ManualLogRequest)
admin.site.register(GlobalSettings)
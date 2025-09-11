from rest_framework import serializers
from .models import (
    RawAttendanceLog, OvertimeRequest, DailyAttendanceReport, Employee, 
    LeaveRequest, MissionRequest, ManualLogRequest, GlobalSettings, WorkShift, ShiftDayRule
)

class ShiftDayRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = ShiftDayRule
        fields = ['id', 'day_of_week', 'is_work_day', 'start_time', 'end_time', 'required_work_minutes']
        read_only_fields = ['id']

class WorkShiftDetailSerializer(serializers.ModelSerializer):
    day_rules = ShiftDayRuleSerializer(many=True)
    class Meta:
        model = WorkShift
        fields = ['id', 'name', 'day_rules']

    def update(self, instance, validated_data):
        rules_data = validated_data.pop('day_rules')
        instance.name = validated_data.get('name', instance.name)
        instance.save()

        for rule_data in rules_data:
            day_of_week = rule_data.get('day_of_week')
            rule_to_update = instance.day_rules.get(day_of_week=day_of_week)
            
            rule_to_update.is_work_day = rule_data.get('is_work_day', rule_to_update.is_work_day)
            rule_to_update.start_time = rule_data.get('start_time', rule_to_update.start_time)
            rule_to_update.end_time = rule_data.get('end_time', rule_to_update.end_time)
            rule_to_update.required_work_minutes = rule_data.get('required_work_minutes', rule_to_update.required_work_minutes)
            rule_to_update.save()
            
        return instance

class WorkShiftSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkShift
        fields = ['id', 'name']
class RawAttendanceLogSerializer(serializers.ModelSerializer):
    class Meta: model = RawAttendanceLog; fields = ['employee_code', 'timestamp']
class OvertimeRequestCreateSerializer(serializers.ModelSerializer):
    class Meta: model = OvertimeRequest; fields = ['date', 'requested_minutes']
    def validate(self, data):
        employee = self.context['request'].user.employee
        if OvertimeRequest.objects.filter(employee=employee, date=data['date']).exists():
            raise serializers.ValidationError("An overtime request for this employee on this date already exists.")
        return data
class OvertimeRequestListSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True); status = serializers.CharField(source='get_status_display', read_only=True) 
    class Meta: model = OvertimeRequest; fields = ['id', 'date', 'employee_name', 'requested_minutes', 'status'] 
class DailyAttendanceReportSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    class Meta:
        model = DailyAttendanceReport
        fields = ['id', 'employee_name', 'date', 'first_check_in', 'last_check_out', 'total_lateness_minutes', 'penalty_minutes', 'required_work_minutes_today', 'total_worked_minutes', 'work_shortfall_minutes', 'work_overtime_minutes']
class LeaveRequestCreateSerializer(serializers.ModelSerializer):
    class Meta: model = LeaveRequest; fields = ['date', 'leave_type', 'requested_minutes', 'reason']
    def validate(self, data):
        employee = self.context['request'].user.employee
        if LeaveRequest.objects.filter(employee=employee, date=data['date']).exists(): raise serializers.ValidationError("A leave request for this employee on this date already exists.")
        if data.get('leave_type') == LeaveRequest.TYPE_FULL_DAY: data['requested_minutes'] = 0
        elif data.get('leave_type') == LeaveRequest.TYPE_HOURLY and data.get('requested_minutes', 0) <= 0:
            raise serializers.ValidationError("Requested minutes must be greater than 0 for hourly leave.")
        return data
class LeaveRequestListSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True); status = serializers.CharField(source='get_status_display', read_only=True); leave_type = serializers.CharField(source='get_leave_type_display', read_only=True)
    class Meta: model = LeaveRequest; fields = ['id', 'date', 'employee_name', 'leave_type', 'requested_minutes', 'reason', 'status']
class MissionRequestCreateSerializer(serializers.ModelSerializer):
    class Meta: model = MissionRequest; fields = ['date', 'mission_type', 'start_time', 'end_time', 'destination', 'reason']
    def validate(self, data):
        employee = self.context['request'].user.employee
        if MissionRequest.objects.filter(employee=employee, date=data['date']).exists(): raise serializers.ValidationError("A mission request for this employee on this date already exists.")
        if data.get('mission_type') == MissionRequest.TYPE_HOURLY:
            if not data.get('start_time') or not data.get('end_time'): raise serializers.ValidationError("Start and End time are required for hourly missions.")
            if data.get('start_time') >= data.get('end_time'): raise serializers.ValidationError("End time must be after start time.")
        else: data['start_time'] = None; data['end_time'] = None
        return data
class MissionRequestListSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True); status = serializers.CharField(source='get_status_display', read_only=True); mission_type = serializers.CharField(source='get_mission_type_display', read_only=True)
    class Meta: model = MissionRequest; fields = ['id', 'date', 'employee_name', 'mission_type', 'start_time', 'end_time', 'destination', 'reason', 'status']
class ManualLogRequestCreateSerializer(serializers.ModelSerializer):
    class Meta: model = ManualLogRequest; fields = ['date', 'time', 'log_type', 'reason']
class ManualLogRequestPairCreateSerializer(serializers.Serializer):
    date = serializers.DateField(); start_time = serializers.TimeField(); end_time = serializers.TimeField(); reason = serializers.CharField(required=False, allow_blank=True)
    def validate(self, data):
        if data['start_time'] >= data['end_time']: raise serializers.ValidationError("End time must be after start time.")
        return data
class ManualLogRequestListSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True); status = serializers.CharField(source='get_status_display', read_only=True); log_type = serializers.CharField(source='get_log_type_display', read_only=True)
    class Meta: model = ManualLogRequest; fields = ['id', 'date', 'time', 'employee_name', 'log_type', 'reason', 'status']
class GlobalSettingsSerializer(serializers.ModelSerializer):
    class Meta: model = GlobalSettings; fields = ['grace_period_minutes', 'penalty_rate']
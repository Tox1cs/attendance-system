from rest_framework import serializers
from .models import (
    RawAttendanceLog, OvertimeRequest, DailyAttendanceReport, Employee, 
    LeaveRequest, MissionRequest, ManualLogRequest
)

class RawAttendanceLogSerializer(serializers.ModelSerializer):
    class Meta: model = RawAttendanceLog; fields = ['employee_code', 'timestamp']

class OvertimeRequestCreateSerializer(serializers.ModelSerializer):
    class Meta: model = OvertimeRequest; fields = ['id', 'date', 'requested_minutes']

class OvertimeRequestListSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    status = serializers.CharField(source='get_status_display', read_only=True) 
    class Meta: model = OvertimeRequest; fields = ['id', 'date', 'employee_name', 'requested_minutes', 'status'] 

class DailyAttendanceReportSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    class Meta:
        model = DailyAttendanceReport
        fields = ['id', 'employee_name', 'date', 'first_check_in', 'last_check_out', 'total_lateness_minutes', 'penalty_minutes', 'required_work_minutes_today', 'total_worked_minutes', 'work_shortfall_minutes', 'work_overtime_minutes']

class LeaveRequestCreateSerializer(serializers.ModelSerializer):
    class Meta: model = LeaveRequest; fields = ['date', 'leave_type', 'requested_minutes', 'reason']
    def validate(self, data):
        if data.get('leave_type') == LeaveRequest.TYPE_FULL_DAY: data['requested_minutes'] = 0
        elif data.get('leave_type') == LeaveRequest.TYPE_HOURLY and data.get('requested_minutes', 0) <= 0:
            raise serializers.ValidationError("Requested minutes must be greater than 0 for hourly leave.")
        return data

class LeaveRequestListSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    status = serializers.CharField(source='get_status_display', read_only=True)
    leave_type = serializers.CharField(source='get_leave_type_display', read_only=True)
    class Meta: model = LeaveRequest; fields = ['id', 'date', 'employee_name', 'leave_type', 'requested_minutes', 'reason', 'status']

class MissionRequestCreateSerializer(serializers.ModelSerializer):
    class Meta: model = MissionRequest; fields = ['date', 'mission_type', 'start_time', 'end_time', 'destination', 'reason']
    def validate(self, data):
        if data.get('mission_type') == MissionRequest.TYPE_HOURLY:
            if not data.get('start_time') or not data.get('end_time'): raise serializers.ValidationError("Start and End time are required for hourly missions.")
            if data.get('start_time') >= data.get('end_time'): raise serializers.ValidationError("End time must be after start time.")
        else: data['start_time'] = None; data['end_time'] = None
        return data

class MissionRequestListSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    status = serializers.CharField(source='get_status_display', read_only=True)
    mission_type = serializers.CharField(source='get_mission_type_display', read_only=True)
    class Meta: model = MissionRequest; fields = ['id', 'date', 'employee_name', 'mission_type', 'start_time', 'end_time', 'destination', 'reason', 'status']

class ManualLogRequestCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ManualLogRequest
        fields = ['date', 'time', 'log_type', 'reason']

class ManualLogRequestPairCreateSerializer(serializers.Serializer):
    date = serializers.DateField()
    start_time = serializers.TimeField()
    end_time = serializers.TimeField()
    reason = serializers.CharField(required=False, allow_blank=True)
    def validate(self, data):
        if data['start_time'] >= data['end_time']:
            raise serializers.ValidationError("End time must be after start time.")
        return data

class ManualLogRequestListSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    status = serializers.CharField(source='get_status_display', read_only=True)
    log_type = serializers.CharField(source='get_log_type_display', read_only=True)
    class Meta:
        model = ManualLogRequest
        fields = ['id', 'date', 'time', 'employee_name', 'log_type', 'reason', 'status']
from rest_framework import serializers
from .models import (
    RawAttendanceLog, OvertimeRequest, DailyAttendanceReport, Employee, 
    LeaveRequest
)

class RawAttendanceLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = RawAttendanceLog
        fields = ['employee_code', 'timestamp']

class OvertimeRequestCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = OvertimeRequest
        fields = ['id', 'date', 'requested_minutes']


class OvertimeRequestListSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    status = serializers.CharField(source='get_status_display', read_only=True) 
    class Meta:
        model = OvertimeRequest
        fields = ['id', 'date', 'employee_name', 'requested_minutes', 'status'] 


class DailyAttendanceReportSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    class Meta:
        model = DailyAttendanceReport
        fields = [
            'id', 'employee_name', 'date', 'first_check_in', 'last_check_out',
            'total_lateness_minutes', 'penalty_minutes', 'required_work_minutes_today',
            'total_worked_minutes', 'work_shortfall_minutes', 'work_overtime_minutes',
        ]


class LeaveRequestCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = LeaveRequest
        fields = ['date', 'leave_type', 'requested_minutes', 'reason']
        
    def validate(self, data):
        if data.get('leave_type') == LeaveRequest.TYPE_FULL_DAY:
            data['requested_minutes'] = 0
        elif data.get('leave_type') == LeaveRequest.TYPE_HOURLY:
            if data.get('requested_minutes', 0) <= 0:
                raise serializers.ValidationError("Requested minutes must be greater than 0 for hourly leave.")
        return data

class LeaveRequestListSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    status = serializers.CharField(source='get_status_display', read_only=True)
    leave_type = serializers.CharField(source='get_leave_type_display', read_only=True)
    
    class Meta:
        model = LeaveRequest
        fields = ['id', 'date', 'employee_name', 'leave_type', 'requested_minutes', 'reason', 'status']
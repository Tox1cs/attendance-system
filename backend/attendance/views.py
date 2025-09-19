from rest_framework import generics
from .models import (
    RawAttendanceLog, OvertimeRequest, DailyAttendanceReport, 
    LeaveRequest, MissionRequest, ManualLogRequest, Holiday, GlobalSettings, WorkShift, Employee, ShiftDayRule
)
from .serializers import (
    RawAttendanceLogSerializer, OvertimeRequestCreateSerializer, DailyAttendanceReportSerializer, OvertimeRequestListSerializer,
    LeaveRequestCreateSerializer, LeaveRequestListSerializer, MissionRequestCreateSerializer, MissionRequestListSerializer,
    ManualLogRequestCreateSerializer, ManualLogRequestPairCreateSerializer, ManualLogRequestListSerializer, GlobalSettingsSerializer,
    WorkShiftSerializer, WorkShiftDetailSerializer, HolidaySerializer, EmployeeListSerializer
)
from rest_framework.permissions import IsAuthenticated
from .permissions import IsManager, IsOwnerOfRequestAndPending
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from collections import defaultdict
import datetime
from django.utils import timezone
from django.db import transaction
from django.db.models import Min, Max

# --- Main Dashboard & User Views ---

class TeamListView(generics.ListAPIView):
    serializer_class = EmployeeListSerializer
    permission_classes = [IsAuthenticated, IsManager]
    def get_queryset(self):
        manager_employee = self.request.user.employee
        return manager_employee.subordinates.all()

class DashboardDataView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request, *args, **kwargs):
        user = request.user; employee = getattr(user, 'employee', None)
        if not employee: return Response({"error": "Employee profile not found."}, status=status.HTTP_404_NOT_FOUND)
        is_manager = user.groups.filter(name='Manager').exists()
        if is_manager:
            return self.get_manager_dashboard(employee)
        else:
            return self.get_employee_dashboard(employee)

    def get_manager_dashboard(self, manager_employee):
        today = timezone.localdate()
        subordinates = manager_employee.subordinates.all()
        team_employee_codes = list(subordinates.values_list('employee_code', flat=True))
        present_today_logs = RawAttendanceLog.objects.filter(employee_code__in=team_employee_codes, timestamp__date=today).values('employee_code').annotate(first_check_in=Min('timestamp'))
        present_employees = []
        for log in present_today_logs:
            emp = Employee.objects.filter(employee_code=log['employee_code']).first()
            if emp:
                present_employees.append({ "id": emp.id, "full_name": emp.full_name, "first_check_in": log['first_check_in'].strftime('%H:%M')})
        
        personal_chart_data = self.get_employee_chart_data(manager_employee)
        response_data = {
            "role": "manager",
            "present_employees": present_employees,
            "daily_work_chart": personal_chart_data.get("daily_work_chart")
        }
        return Response(response_data, status=status.HTTP_200_OK)

    def get_employee_dashboard(self, employee):
        response_data = self.get_employee_chart_data(employee)
        response_data['role'] = 'employee'
        return Response(response_data, status=status.HTTP_200_OK)

    def get_employee_chart_data(self, employee):
        today = timezone.localdate(); start_of_month = today.replace(day=1)
        logs = RawAttendanceLog.objects.filter(employee_code=employee.employee_code, timestamp__date__range=[start_of_month, today]).order_by('timestamp')
        logs_by_date = defaultdict(list)
        for log in logs: logs_by_date[log.timestamp.date()].append(log.timestamp)
        chart_data = []
        current_day = start_of_month
        while current_day <= today:
            timestamps = logs_by_date.get(current_day, [])
            worked_minutes = 0
            if len(timestamps) >= 2:
                duration = timestamps[-1] - timestamps[0]
                worked_minutes = round(duration.total_seconds() / 60)
            chart_data.append({ "date": current_day.strftime('%Y-%m-%d'), "day": current_day.strftime('%d'), "worked_minutes": worked_minutes })
            current_day += datetime.timedelta(days=1)
        return { "daily_work_chart": chart_data }

class MyGroupedLogsView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request, *args, **kwargs):
        try: employee = request.user.employee
        except AttributeError: return Response({"error": "Employee profile not found."}, status=status.HTTP_404_NOT_FOUND)
        start_date_str = request.query_params.get('start_date'); end_date_str = request.query_params.get('end_date')
        if not start_date_str or not end_date_str: return Response({"error": "start_date and end_date are required parameters."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            start_date = datetime.date.fromisoformat(start_date_str)
            end_date = datetime.date.fromisoformat(end_date_str)
        except ValueError: return Response({"error": "Invalid date format. Use YYYY-MM-DD."}, status=status.HTTP_400_BAD_REQUEST)
        
        logs_queryset = RawAttendanceLog.objects.filter(employee_code=employee.employee_code, timestamp__date__range=[start_date, end_date]).order_by('timestamp')
        leave_queryset = LeaveRequest.objects.filter(employee=employee, date__range=[start_date, end_date], status=LeaveRequest.STATUS_APPROVED)
        raw_logs_map = defaultdict(list)
        for log in logs_queryset: raw_logs_map[log.timestamp.date()].append(log.timestamp.strftime("%H:%M:%S"))
        approved_leave_map = {leave.date: leave for leave in leave_queryset}
        holidays_set = set(Holiday.objects.filter(date__range=[start_date, end_date]).values_list('date', flat=True))
        try: shift_rules = {rule.day_of_week: rule for rule in employee.shift.day_rules.all()}
        except AttributeError: return Response({"error": "Employee is not assigned to a valid shift."}, status=status.HTTP_400_BAD_REQUEST)
        
        final_report = []
        current_date = start_date
        while current_date <= end_date:
            date_str = current_date.isoformat(); day_status = "Unknown"; day_logs = raw_logs_map.get(current_date, []); day_type_info = ""
            if current_date in holidays_set:
                day_status = "HOLIDAY"; day_type_info = Holiday.objects.get(date=current_date).name
            elif current_date in approved_leave_map:
                leave = approved_leave_map[current_date]
                day_status = "LEAVE_FULL" if leave.leave_type == LeaveRequest.TYPE_FULL_DAY else "LEAVE_HOURLY"
                day_type_info = leave.reason or "Leave"
            else:
                day_rule = shift_rules.get(current_date.weekday())
                if not day_rule or not day_rule.is_work_day:
                    day_status = "WEEKEND_OFF"; day_type_info = "Scheduled Day Off"
                else:
                    day_status = "ABSENT" if not day_logs else "PRESENT"
                    day_type_info = "No logs recorded" if not day_logs else f"{len(day_logs)} logs recorded"
            final_report.append({"date": date_str, "status": day_status, "status_info": day_type_info, "logs": day_logs})
            current_date += datetime.timedelta(days=1)
        return Response(final_report, status=status.HTTP_200_OK)

# --- Settings & Admin Views ---

class GlobalSettingsView(generics.RetrieveUpdateAPIView):
    queryset = GlobalSettings.objects.all(); serializer_class = GlobalSettingsSerializer; permission_classes = [IsAuthenticated, IsManager]
    def get_object(self): obj, created = GlobalSettings.objects.get_or_create(pk=1); return obj
class WorkShiftListView(generics.ListCreateAPIView):
    queryset = WorkShift.objects.all(); serializer_class = WorkShiftSerializer; permission_classes = [IsAuthenticated, IsManager]
    @transaction.atomic
    def perform_create(self, serializer):
        shift = serializer.save()
        for i in range(7): ShiftDayRule.objects.create(shift=shift, day_of_week=i)
class WorkShiftDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = WorkShift.objects.all(); serializer_class = WorkShiftDetailSerializer; permission_classes = [IsAuthenticated, IsManager]
class HolidayListCreateView(generics.ListCreateAPIView):
    queryset = Holiday.objects.all().order_by('date'); serializer_class = HolidaySerializer; permission_classes = [IsAuthenticated, IsManager]
class HolidayDestroyView(generics.DestroyAPIView):
    queryset = Holiday.objects.all(); serializer_class = HolidaySerializer; permission_classes = [IsAuthenticated, IsManager]

# --- Employee Request Views (Create, Detail, History) ---

class OvertimeRequestCreateView(generics.CreateAPIView):
    queryset = OvertimeRequest.objects.all(); serializer_class = OvertimeRequestCreateSerializer; permission_classes = [IsAuthenticated] 
    def perform_create(self, serializer): serializer.save(employee=self.request.user.employee)
class OvertimeRequestDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = OvertimeRequest.objects.all(); serializer_class = OvertimeRequestCreateSerializer; permission_classes = [IsAuthenticated, IsOwnerOfRequestAndPending]
class MyRequestHistoryView(generics.ListAPIView):
    serializer_class = OvertimeRequestListSerializer; permission_classes = [IsAuthenticated]
    def get_queryset(self): return OvertimeRequest.objects.filter(employee=self.request.user.employee).order_by('-date')

class LeaveRequestCreateView(generics.CreateAPIView):
    queryset = LeaveRequest.objects.all(); serializer_class = LeaveRequestCreateSerializer; permission_classes = [IsAuthenticated]
    def perform_create(self, serializer): serializer.save(employee=self.request.user.employee, status=LeaveRequest.STATUS_PENDING)
class LeaveRequestDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = LeaveRequest.objects.all(); serializer_class = LeaveRequestCreateSerializer; permission_classes = [IsAuthenticated, IsOwnerOfRequestAndPending]
class MyLeaveHistoryView(generics.ListAPIView):
    serializer_class = LeaveRequestListSerializer; permission_classes = [IsAuthenticated]
    def get_queryset(self): return LeaveRequest.objects.filter(employee=self.request.user.employee).order_by('-date')

class MissionRequestCreateView(generics.CreateAPIView):
    queryset = MissionRequest.objects.all(); serializer_class = MissionRequestCreateSerializer; permission_classes = [IsAuthenticated]
    def perform_create(self, serializer): serializer.save(employee=self.request.user.employee, status=MissionRequest.STATUS_PENDING)
class MissionRequestDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = MissionRequest.objects.all(); serializer_class = MissionRequestCreateSerializer; permission_classes = [IsAuthenticated, IsOwnerOfRequestAndPending]
class MyMissionHistoryView(generics.ListAPIView):
    serializer_class = MissionRequestListSerializer; permission_classes = [IsAuthenticated]
    def get_queryset(self): return MissionRequest.objects.filter(employee=self.request.user.employee).order_by('-date')

class ManualLogRequestDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = ManualLogRequest.objects.all(); serializer_class = ManualLogRequestCreateSerializer; permission_classes = [IsAuthenticated, IsOwnerOfRequestAndPending]
class ManualLogRequestSingleView(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request, *args, **kwargs):
        log_type = request.data.get('log_type'); request_obj = ManualLogRequest.objects.create(employee=request.user.employee, date=timezone.localdate(), time=timezone.localtime().time(), log_type=log_type, reason=request.data.get('reason', 'Real-time remote log'), status=ManualLogRequest.STATUS_PENDING); serializer = ManualLogRequestListSerializer(request_obj); return Response(serializer.data, status=status.HTTP_201_CREATED)
class ManualLogRequestPairView(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request, *args, **kwargs):
        serializer = ManualLogRequestPairCreateSerializer(data=request.data)
        if serializer.is_valid():
            data = serializer.validated_data; employee = request.user.employee
            req_in = ManualLogRequest.objects.create(employee=employee, date=data['date'], time=data['start_time'], log_type=ManualLogRequest.LOG_TYPE_IN, reason=data.get('reason', 'Paired remote log'), status=ManualLogRequest.STATUS_PENDING)
            req_out = ManualLogRequest.objects.create(employee=employee, date=data['date'], time=data['end_time'], log_type=ManualLogRequest.LOG_TYPE_OUT, reason=data.get('reason', 'Paired remote log'), status=ManualLogRequest.STATUS_PENDING)
            return Response({"status": "Paired log requests created successfully."}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
class MyManualLogHistoryView(generics.ListAPIView):
    serializer_class = ManualLogRequestListSerializer; permission_classes = [IsAuthenticated]
    def get_queryset(self): return ManualLogRequest.objects.filter(employee=self.request.user.employee).order_by('-date', '-time')

# --- Manager Review Views ---

class PendingOvertimeView(generics.ListAPIView):
    permission_classes = [IsAuthenticated, IsManager]; serializer_class = OvertimeRequestListSerializer 
    def get_queryset(self):
        manager_employee = self.request.user.employee; subordinate_ids = manager_employee.subordinates.values_list('id', flat=True)
        team_ids = list(subordinate_ids) + [manager_employee.id]; queryset = OvertimeRequest.objects.filter(employee_id__in=team_ids, status=OvertimeRequest.STATUS_PENDING)
        employee_id = self.request.query_params.get('employee_id');
        if employee_id and employee_id != 'all': queryset = queryset.filter(employee_id=employee_id)
        return queryset.order_by('date')
class ReviewOvertimeView(APIView):
    permission_classes = [IsAuthenticated, IsManager]
    def post(self, request, pk, format=None):
        try: req_to_review = OvertimeRequest.objects.get(pk=pk)
        except OvertimeRequest.DoesNotExist: return Response({"error": "Request not found"}, status=status.HTTP_404_NOT_FOUND)
        action = request.data.get('action')
        if action == "APPROVE": req_to_review.status = OvertimeRequest.STATUS_APPROVED; req_to_review.save(); return Response({"status": "Request Approved"})
        elif action == "REJECT": req_to_review.status = OvertimeRequest.STATUS_REJECTED; req_to_review.save(); return Response({"status": "Request Rejected"})
        else: return Response({"error": "Invalid action"}, status=status.HTTP_400_BAD_REQUEST)

class PendingLeaveView(generics.ListAPIView):
    permission_classes = [IsAuthenticated, IsManager]; serializer_class = LeaveRequestListSerializer
    def get_queryset(self):
        manager_employee = self.request.user.employee; subordinate_ids = manager_employee.subordinates.values_list('id', flat=True)
        team_ids = list(subordinate_ids) + [manager_employee.id]; queryset = LeaveRequest.objects.filter(employee_id__in=team_ids, status=LeaveRequest.STATUS_PENDING)
        employee_id = self.request.query_params.get('employee_id')
        if employee_id and employee_id != 'all': queryset = queryset.filter(employee_id=employee_id)
        return queryset.order_by('date')
class ReviewLeaveView(APIView):
    permission_classes = [IsAuthenticated, IsManager]
    def post(self, request, pk, format=None):
        try: req_to_review = LeaveRequest.objects.get(pk=pk)
        except LeaveRequest.DoesNotExist: return Response({"error": "Request not found"}, status=status.HTTP_404_NOT_FOUND)
        action = request.data.get('action')
        if action == "APPROVE": req_to_review.status = LeaveRequest.STATUS_APPROVED; req_to_review.save(); return Response({"status": "Request Approved"})
        elif action == "REJECT": req_to_review.status = LeaveRequest.STATUS_REJECTED; req_to_review.save(); return Response({"status": "Request Rejected"})
        else: return Response({"error": "Invalid action"}, status=status.HTTP_400_BAD_REQUEST)

class PendingMissionView(generics.ListAPIView):
    permission_classes = [IsAuthenticated, IsManager]; serializer_class = MissionRequestListSerializer
    def get_queryset(self):
        manager_employee = self.request.user.employee; subordinate_ids = manager_employee.subordinates.values_list('id', flat=True)
        team_ids = list(subordinate_ids) + [manager_employee.id]; queryset = MissionRequest.objects.filter(employee_id__in=team_ids, status=MissionRequest.STATUS_PENDING)
        employee_id = self.request.query_params.get('employee_id')
        if employee_id and employee_id != 'all': queryset = queryset.filter(employee_id=employee_id)
        return queryset.order_by('date')
class ReviewMissionView(APIView):
    permission_classes = [IsAuthenticated, IsManager]
    def post(self, request, pk, format=None):
        try: req_to_review = MissionRequest.objects.get(pk=pk)
        except MissionRequest.DoesNotExist: return Response({"error": "Request not found"}, status=status.HTTP_404_NOT_FOUND)
        action = request.data.get('action')
        if action == "APPROVE": req_to_review.status = MissionRequest.STATUS_APPROVED; req_to_review.save(); return Response({"status": "Request Approved"})
        elif action == "REJECT": req_to_review.status = MissionRequest.STATUS_REJECTED; req_to_review.save(); return Response({"status": "Request Rejected"})
        else: return Response({"error": "Invalid action"}, status=status.HTTP_400_BAD_REQUEST)

class PendingManualLogView(generics.ListAPIView):
    permission_classes = [IsAuthenticated, IsManager]; serializer_class = ManualLogRequestListSerializer
    def get_queryset(self):
        manager_employee = self.request.user.employee; subordinate_ids = manager_employee.subordinates.values_list('id', flat=True)
        team_ids = list(subordinate_ids) + [manager_employee.id]; queryset = ManualLogRequest.objects.filter(employee_id__in=team_ids, status=ManualLogRequest.STATUS_PENDING)
        employee_id = self.request.query_params.get('employee_id')
        if employee_id and employee_id != 'all': queryset = queryset.filter(employee_id=employee_id)
        return queryset.order_by('date', 'time')
class ReviewManualLogView(APIView):
    permission_classes = [IsAuthenticated, IsManager]
    def post(self, request, pk, format=None):
        try: req_to_review = ManualLogRequest.objects.get(pk=pk)
        except ManualLogRequest.DoesNotExist: return Response({"error": "Request not found"}, status=status.HTTP_404_NOT_FOUND)
        action = request.data.get('action')
        if action == "APPROVE":
            req_to_review.status = ManualLogRequest.STATUS_APPROVED; req_to_review.save()
            timestamp = timezone.make_aware(datetime.datetime.combine(req_to_review.date, req_to_review.time))
            RawAttendanceLog.objects.create(employee_code=req_to_review.employee.employee_code, timestamp=timestamp)
            return Response({"status": "Log Approved and created successfully"})
        elif action == "REJECT":
            req_to_review.status = ManualLogRequest.STATUS_REJECTED; req_to_review.save(); return Response({"status": "Request Rejected"})
        else: return Response({"error": "Invalid action"}, status=status.HTTP_400_BAD_REQUEST)

# --- Hardware Endpoint ---
class LogAttendanceView(generics.CreateAPIView):
    queryset = RawAttendanceLog.objects.all()
    serializer_class = RawAttendanceLogSerializer
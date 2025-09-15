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
from django.db.models import Count, Sum, Q
from django.db.models.functions import TruncMonth

class TeamListView(generics.ListAPIView):
    serializer_class = EmployeeListSerializer
    permission_classes = [IsAuthenticated, IsManager]
    def get_queryset(self):
        manager_employee = self.request.user.employee
        return manager_employee.subordinates.all()

class MyGroupedLogsView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request, *args, **kwargs):
        try:
            employee = request.user.employee
            employee_code = employee.employee_code
            employee_shift = employee.shift
        except AttributeError:
            return Response({"error": "Employee profile not found."}, status=status.HTTP_404_NOT_FOUND)
        
        start_date_str = request.query_params.get('start_date')
        end_date_str = request.query_params.get('end_date')

        if not start_date_str or not end_date_str:
            return Response({"error": "start_date and end_date are required parameters."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            start_date = datetime.date.fromisoformat(start_date_str)
            end_date = datetime.date.fromisoformat(end_date_str)
        except ValueError:
            return Response({"error": "Invalid date format. Use YYYY-MM-DD."}, status=status.HTTP_400_BAD_REQUEST)

        logs_queryset = RawAttendanceLog.objects.filter(
            employee_code=employee_code,
            timestamp__date__range=[start_date, end_date]
        ).order_by('timestamp')

        leave_queryset = LeaveRequest.objects.filter(
            employee=employee,
            date__range=[start_date, end_date],
            status=LeaveRequest.STATUS_APPROVED
        )

        raw_logs_map = defaultdict(list)
        for log in logs_queryset:
            raw_logs_map[log.timestamp.date()].append(log.timestamp.strftime("%H:%M:%S"))

        approved_leave_map = {leave.date: leave for leave in leave_queryset}
        holidays_set = set(Holiday.objects.filter(date__range=[start_date, end_date]).values_list('date', flat=True))
        
        try:
            shift_rules = {rule.day_of_week: rule for rule in employee_shift.day_rules.all()}
        except AttributeError:
            return Response({"error": "Employee is not assigned to a valid shift."}, status=status.HTTP_400_BAD_REQUEST)
        
        final_report = []
        current_date = start_date
        while current_date <= end_date:
            date_str = current_date.isoformat()
            day_status = "Unknown"
            day_logs = raw_logs_map.get(current_date, [])
            day_type_info = ""

            if current_date in holidays_set:
                day_status = "HOLIDAY"
                day_type_info = Holiday.objects.get(date=current_date).name
            elif current_date in approved_leave_map:
                leave = approved_leave_map[current_date]
                if leave.leave_type == LeaveRequest.TYPE_FULL_DAY:
                    day_status = "LEAVE_FULL"
                    day_type_info = leave.reason or "Full Day Leave"
                else:
                    day_status = "LEAVE_HOURLY"
                    day_type_info = f"Hourly Leave ({leave.start_time.strftime('%H:%M')} - {leave.end_time.strftime('%H:%M')})" if leave.start_time and leave.end_time else "Hourly Leave"
            else:
                day_rule = shift_rules.get(current_date.weekday())
                if not day_rule or not day_rule.is_work_day:
                    day_status = "WEEKEND_OFF"
                    day_type_info = "Scheduled Day Off"
                else:
                    if not day_logs:
                        day_status = "ABSENT"
                        day_type_info = "No logs recorded"
                    else:
                        day_status = "PRESENT"
                        day_type_info = f"{len(day_logs)} logs recorded"

            final_report.append({
                "date": date_str,
                "status": day_status,
                "status_info": day_type_info,
                "logs": day_logs
            })
            current_date += datetime.timedelta(days=1)
        
        return Response(final_report, status=status.HTTP_200_OK)

class DashboardDataView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request, *args, **kwargs):
        user = request.user; employee = getattr(user, 'employee', None)
        if not employee: return Response({"error": "Employee profile not found."}, status=status.HTTP_404_NOT_FOUND)
        is_manager = user.groups.filter(name='Manager').exists()
        personal_data = self.get_employee_data(employee); monthly_performance_data = self.get_monthly_performance_data(employee)
        if is_manager:
            manager_data = self.get_manager_data(employee)
            response_data = { "role": "manager", "personal_stats": personal_data.get("today_status"), "team_stats": manager_data.get("stats"), "recent_reports": manager_data.get("recent_reports"), "monthly_performance": monthly_performance_data, }
            return Response(response_data, status=status.HTTP_200_OK)
        else:
            employee_data = personal_data; employee_data["monthly_performance"] = monthly_performance_data
            return Response(employee_data, status=status.HTTP_200_OK)
    def get_manager_data(self, manager_employee):
        subordinates = manager_employee.subordinates.all(); team_ids = list(subordinates.values_list('id', flat=True)); today = timezone.localdate()
        team_stats = { 'total_team_members': subordinates.count(), 'on_leave_today': LeaveRequest.objects.filter(employee_id__in=team_ids, date=today, status=LeaveRequest.STATUS_APPROVED, leave_type=LeaveRequest.TYPE_FULL_DAY).count(), 'on_mission_today': MissionRequest.objects.filter(employee_id__in=team_ids, date=today, status=MissionRequest.STATUS_APPROVED, mission_type=MissionRequest.TYPE_FULL_DAY).count(), 'present_today': DailyAttendanceReport.objects.filter(employee_id__in=team_ids, date=today).exclude(first_check_in=None).count(), }
        recent_reports_qs = DailyAttendanceReport.objects.filter(employee_id__in=team_ids).order_by('-date')[:20]
        recent_reports_serializer = DailyAttendanceReportSerializer(recent_reports_qs, many=True)
        return {"stats": team_stats, "recent_reports": recent_reports_serializer.data}
    def get_employee_data(self, employee):
        today = timezone.localdate(); today_report = DailyAttendanceReport.objects.filter(employee=employee, date=today).first()
        today_status = { 'lateness': today_report.total_lateness_minutes if today_report else 0, 'shortfall': today_report.work_shortfall_minutes if today_report else 0, 'overtime': today_report.work_overtime_minutes if today_report else 0, 'first_check_in': today_report.first_check_in.strftime('%H:%M:%S') if today_report and today_report.first_check_in else 'N/A', }
        return {"role": "employee", "today_status": today_status}
    def get_monthly_performance_data(self, employee):
        today = timezone.localdate(); start_date = (today - datetime.timedelta(days=365)).replace(day=1)
        reports = DailyAttendanceReport.objects.filter(employee=employee, date__gte=start_date).annotate(month=TruncMonth('date')).values('month').annotate( total_lateness=Sum('total_lateness_minutes'), total_shortfall=Sum('work_shortfall_minutes'), total_overtime=Sum('work_overtime_minutes'), total_working_days=Count('id', filter=Q(first_check_in__isnull=False))).order_by('month')
        monthly_data_map = { r['month'].strftime('%Y-%m'): { 'month': r['month'].strftime('%b %Y'), 'lateness': r['total_lateness'] or 0, 'shortfall': r['total_shortfall'] or 0, 'overtime': r['total_overtime'] or 0, 'working_days': r['total_working_days'] or 0, } for r in reports }
        all_months_data = []; current_month = start_date
        while current_month <= today:
            month_key = current_month.strftime('%Y-%m')
            if month_key not in monthly_data_map:
                all_months_data.append({ 'month': current_month.strftime('%b %Y'), 'lateness': 0, 'shortfall': 0, 'overtime': 0, 'working_days': 0, })
            else: all_months_data.append(monthly_data_map[month_key])
            next_month = current_month.replace(day=28) + datetime.timedelta(days=4)
            current_month = next_month.replace(day=1)
        return all_months_data
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
class LogAttendanceView(generics.CreateAPIView):
    queryset = RawAttendanceLog.objects.all(); serializer_class = RawAttendanceLogSerializer
class OvertimeRequestCreateView(generics.CreateAPIView):
    queryset = OvertimeRequest.objects.all(); serializer_class = OvertimeRequestCreateSerializer; permission_classes = [IsAuthenticated] 
    def get_serializer_context(self): return {'request': self.request}
    def perform_create(self, serializer): serializer.save(employee=self.request.user.employee)
class OvertimeRequestDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = OvertimeRequest.objects.all(); serializer_class = OvertimeRequestCreateSerializer; permission_classes = [IsAuthenticated, IsOwnerOfRequestAndPending]
class MyRequestHistoryView(generics.ListAPIView):
    serializer_class = OvertimeRequestListSerializer; permission_classes = [IsAuthenticated]
    def get_queryset(self): return OvertimeRequest.objects.filter(employee=self.request.user.employee).order_by('-date')
class LeaveRequestCreateView(generics.CreateAPIView):
    queryset = LeaveRequest.objects.all(); serializer_class = LeaveRequestCreateSerializer; permission_classes = [IsAuthenticated]
    def get_serializer_context(self): return {'request': self.request}
    def perform_create(self, serializer): serializer.save(employee=self.request.user.employee, status=LeaveRequest.STATUS_PENDING)
class LeaveRequestDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = LeaveRequest.objects.all(); serializer_class = LeaveRequestCreateSerializer; permission_classes = [IsAuthenticated, IsOwnerOfRequestAndPending]
class MyLeaveHistoryView(generics.ListAPIView):
    serializer_class = LeaveRequestListSerializer; permission_classes = [IsAuthenticated]
    def get_queryset(self): return LeaveRequest.objects.filter(employee=self.request.user.employee).order_by('-date')
class MissionRequestCreateView(generics.CreateAPIView):
    queryset = MissionRequest.objects.all(); serializer_class = MissionRequestCreateSerializer; permission_classes = [IsAuthenticated]
    def get_serializer_context(self): return {'request': self.request}
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
        try: req_to_review = OvertimeRequest.objects.get(pk=pk, status=OvertimeRequest.STATUS_PENDING)
        except OvertimeRequest.DoesNotExist: return Response({"error": "Pending request not found"}, status=status.HTTP_404_NOT_FOUND)
        action = request.data.get('action')
        if action == "APPROVE": req_to_review.status = OvertimeRequest.STATUS_APPROVED; req_to_review.save(); return Response({"status": "Request Approved"}, status=status.HTTP_200_OK)
        elif action == "REJECT": req_to_review.status = OvertimeRequest.STATUS_REJECTED; req_to_review.save(); return Response({"status": "Request Rejected"}, status=status.HTTP_200_OK)
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
        try: req_to_review = LeaveRequest.objects.get(pk=pk, status=LeaveRequest.STATUS_PENDING)
        except LeaveRequest.DoesNotExist: return Response({"error": "Pending leave request not found"}, status=status.HTTP_404_NOT_FOUND)
        action = request.data.get('action')
        if action == "APPROVE": req_to_review.status = LeaveRequest.STATUS_APPROVED; req_to_review.save(); return Response({"status": "Leave Approved"}, status=status.HTTP_200_OK)
        elif action == "REJECT": req_to_review.status = LeaveRequest.STATUS_REJECTED; req_to_review.save(); return Response({"status": "Leave Rejected"}, status=status.HTTP_200_OK)
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
        try: req_to_review = MissionRequest.objects.get(pk=pk, status=MissionRequest.STATUS_PENDING)
        except MissionRequest.DoesNotExist: return Response({"error": "Pending mission request not found"}, status=status.HTTP_404_NOT_FOUND)
        action = request.data.get('action')
        if action == "APPROVE": req_to_review.status = MissionRequest.STATUS_APPROVED; req_to_review.save(); return Response({"status": "Mission Approved"}, status=status.HTTP_200_OK)
        elif action == "REJECT": req_to_review.status = MissionRequest.STATUS_REJECTED; req_to_review.save(); return Response({"status": "Mission Rejected"}, status=status.HTTP_200_OK)
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
        try: req_to_review = ManualLogRequest.objects.get(pk=pk, status=ManualLogRequest.STATUS_PENDING)
        except ManualLogRequest.DoesNotExist: return Response({"error": "Pending log request not found"}, status=status.HTTP_404_NOT_FOUND)
        action = request.data.get('action')
        if action == "APPROVE":
            req_to_review.status = ManualLogRequest.STATUS_APPROVED; req_to_review.save()
            timestamp = timezone.make_aware(datetime.datetime.combine(req_to_review.date, req_to_review.time))
            RawAttendanceLog.objects.create(employee_code=req_to_review.employee.employee_code, timestamp=timestamp)
            return Response({"status": "Log Approved and created successfully"}, status=status.HTTP_200_OK)
        elif action == "REJECT":
            req_to_review.status = ManualLogRequest.STATUS_REJECTED; req_to_review.save(); return Response({"status": "Log Rejected"}, status=status.HTTP_200_OK)
        else: return Response({"error": "Invalid action"}, status=status.HTTP_400_BAD_REQUEST)
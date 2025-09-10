from rest_framework import generics
from .models import (
    RawAttendanceLog, OvertimeRequest, DailyAttendanceReport, 
    LeaveRequest, MissionRequest, ManualLogRequest, Holiday
)
from .serializers import (
    RawAttendanceLogSerializer, OvertimeRequestCreateSerializer, DailyAttendanceReportSerializer, OvertimeRequestListSerializer,
    LeaveRequestCreateSerializer, LeaveRequestListSerializer, MissionRequestCreateSerializer, MissionRequestListSerializer,
    ManualLogRequestCreateSerializer, ManualLogRequestPairCreateSerializer, ManualLogRequestListSerializer
)
from rest_framework.permissions import IsAuthenticated
from .permissions import IsManager
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from collections import defaultdict
import datetime
from django.utils import timezone

class LogAttendanceView(generics.CreateAPIView):
    queryset = RawAttendanceLog.objects.all(); serializer_class = RawAttendanceLogSerializer
class OvertimeRequestCreateView(generics.CreateAPIView):
    queryset = OvertimeRequest.objects.all(); serializer_class = OvertimeRequestCreateSerializer; permission_classes = [IsAuthenticated] 
    def perform_create(self, serializer): serializer.save(employee=self.request.user.employee)
class MyRequestHistoryView(generics.ListAPIView):
    serializer_class = OvertimeRequestListSerializer; permission_classes = [IsAuthenticated]
    def get_queryset(self): return OvertimeRequest.objects.filter(employee=self.request.user.employee).order_by('-date')
class LeaveRequestCreateView(generics.CreateAPIView):
    queryset = LeaveRequest.objects.all(); serializer_class = LeaveRequestCreateSerializer; permission_classes = [IsAuthenticated]
    def perform_create(self, serializer): serializer.save(employee=self.request.user.employee, status=LeaveRequest.STATUS_PENDING)
class MyLeaveHistoryView(generics.ListAPIView):
    serializer_class = LeaveRequestListSerializer; permission_classes = [IsAuthenticated]
    def get_queryset(self): return LeaveRequest.objects.filter(employee=self.request.user.employee).order_by('-date')
class MyGroupedLogsView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request, *args, **kwargs):
        try: employee = request.user.employee; employee_code = employee.employee_code; employee_shift = employee.shift
        except AttributeError: return Response({"error": "Employee profile not found."}, status=status.HTTP_404_NOT_FOUND)
        start_date_str = request.query_params.get('start_date'); end_date_str = request.query_params.get('end_date')
        if not start_date_str or not end_date_str: return Response({"error": "start_date and end_date required."}, status=status.HTTP_400_BAD_REQUEST)
        try: start_date = datetime.date.fromisoformat(start_date_str); end_date = datetime.date.fromisoformat(end_date_str)
        except ValueError: return Response({"error": "Invalid date format. Use YYYY-MM-DD."}, status=status.HTTP_400_BAD_REQUEST)
        logs_queryset = RawAttendanceLog.objects.filter(employee_code=employee_code, timestamp__date__range=[start_date, end_date]).order_by('timestamp')
        leave_queryset = LeaveRequest.objects.filter(employee=employee, date__range=[start_date, end_date], status=LeaveRequest.STATUS_APPROVED)
        raw_logs_map = defaultdict(list);
        for log in logs_queryset: raw_logs_map[log.timestamp.date()].append(log.timestamp.strftime("%H:%M:%S"))
        approved_leave_map = {leave.date: leave for leave in leave_queryset}
        holidays_set = set(Holiday.objects.filter(date__range=[start_date, end_date]).values_list('date', flat=True))
        try: shift_rules = {rule.day_of_week: rule.is_work_day for rule in employee_shift.day_rules.all()}
        except AttributeError: return Response({"error": "Employee is not assigned to a valid shift."}, status=status.HTTP_400_BAD_REQUEST)
        final_report = []
        current_date = start_date
        while current_date <= end_date:
            date_str = current_date.isoformat(); day_status = "Unknown"; day_logs = raw_logs_map.get(current_date, []); day_type_info = ""
            if current_date in holidays_set: day_status = "HOLIDAY"; day_type_info = Holiday.objects.get(date=current_date).name
            elif current_date in approved_leave_map:
                leave = approved_leave_map[current_date]
                if leave.leave_type == LeaveRequest.TYPE_FULL_DAY: day_status = "LEAVE_FULL"; day_type_info = leave.reason or "Full Day Leave"
                else: day_status = "LEAVE_HOURLY"; day_type_info = f"Hourly Leave ({leave.requested_minutes} min)"
            else:
                weekday = current_date.weekday(); is_work_day = shift_rules.get(weekday, False)
                if not is_work_day: day_status = "WEEKEND_OFF"; day_type_info = "Scheduled Day Off"
                else:
                    if not day_logs: day_status = "ABSENT"; day_type_info = "No logs recorded"
                    else: day_status = "PRESENT"; day_type_info = f"{len(day_logs)} logs recorded"
            final_report.append({"date": date_str, "status": day_status, "status_info": day_type_info, "logs": day_logs})
            current_date += datetime.timedelta(days=1)
        return Response(final_report, status=status.HTTP_200_OK)
class MissionRequestCreateView(generics.CreateAPIView):
    queryset = MissionRequest.objects.all(); serializer_class = MissionRequestCreateSerializer; permission_classes = [IsAuthenticated]
    def perform_create(self, serializer): serializer.save(employee=self.request.user.employee, status=MissionRequest.STATUS_PENDING)
class MyMissionHistoryView(generics.ListAPIView):
    serializer_class = MissionRequestListSerializer; permission_classes = [IsAuthenticated]
    def get_queryset(self): return MissionRequest.objects.filter(employee=self.request.user.employee).order_by('-date')
class ManualLogRequestSingleView(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request, *args, **kwargs):
        log_type = request.data.get('log_type')
        if log_type not in ['IN', 'OUT']: return Response({"error": "log_type must be 'IN' or 'OUT'."}, status=status.HTTP_400_BAD_REQUEST)
        request_obj = ManualLogRequest.objects.create(
            employee=request.user.employee, date=timezone.localdate(), time=timezone.localtime().time(),
            log_type=log_type, reason=request.data.get('reason', 'Real-time remote log'), status=ManualLogRequest.STATUS_PENDING
        )
        serializer = ManualLogRequestListSerializer(request_obj)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
class ManualLogRequestPairView(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request, *args, **kwargs):
        serializer = ManualLogRequestPairCreateSerializer(data=request.data)
        if serializer.is_valid():
            data = serializer.validated_data
            employee = request.user.employee
            req_in = ManualLogRequest.objects.create(
                employee=employee, date=data['date'], time=data['start_time'],
                log_type=ManualLogRequest.LOG_TYPE_IN, reason=data.get('reason', 'Paired remote log'), status=ManualLogRequest.STATUS_PENDING
            )
            req_out = ManualLogRequest.objects.create(
                employee=employee, date=data['date'], time=data['end_time'],
                log_type=ManualLogRequest.LOG_TYPE_OUT, reason=data.get('reason', 'Paired remote log'), status=ManualLogRequest.STATUS_PENDING
            )
            return Response({"status": "Paired log requests created successfully."}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
class MyManualLogHistoryView(generics.ListAPIView):
    serializer_class = ManualLogRequestListSerializer
    permission_classes = [IsAuthenticated]
    def get_queryset(self): return ManualLogRequest.objects.filter(employee=self.request.user.employee).order_by('-date', '-time')
class PendingOvertimeView(generics.ListAPIView):
    permission_classes = [IsAuthenticated, IsManager]; serializer_class = OvertimeRequestListSerializer 
    def get_queryset(self): return OvertimeRequest.objects.filter(status=OvertimeRequest.STATUS_PENDING).order_by('date')
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
    def get_queryset(self): return LeaveRequest.objects.filter(status=LeaveRequest.STATUS_PENDING).order_by('date')
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
    def get_queryset(self): return MissionRequest.objects.filter(status=MissionRequest.STATUS_PENDING).order_by('date')
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
    def get_queryset(self): return ManualLogRequest.objects.filter(status=ManualLogRequest.STATUS_PENDING).order_by('date', 'time')
class ReviewManualLogView(APIView):
    permission_classes = [IsAuthenticated, IsManager]
    def post(self, request, pk, format=None):
        try: req_to_review = ManualLogRequest.objects.get(pk=pk, status=ManualLogRequest.STATUS_PENDING)
        except ManualLogRequest.DoesNotExist: return Response({"error": "Pending log request not found"}, status=status.HTTP_404_NOT_FOUND)
        action = request.data.get('action')
        if action == "APPROVE":
            req_to_review.status = ManualLogRequest.STATUS_APPROVED; req_to_review.save()
            timestamp = timezone.make_aware(datetime.datetime.combine(req_to_review.date, req_to_review.time))
            RawAttendanceLog.objects.create(
                employee_code=req_to_review.employee.employee_code, timestamp=timestamp
            )
            return Response({"status": "Log Approved and created successfully"}, status=status.HTTP_200_OK)
        elif action == "REJECT":
            req_to_review.status = ManualLogRequest.STATUS_REJECTED; req_to_review.save()
            return Response({"status": "Log Rejected"}, status=status.HTTP_200_OK)
        else: return Response({"error": "Invalid action"}, status=status.HTTP_400_BAD_REQUEST)
class ManagerReportView(generics.ListAPIView):
    queryset = DailyAttendanceReport.objects.all().order_by('-date', 'employee__full_name')
    serializer_class = DailyAttendanceReportSerializer
    permission_classes = [IsAuthenticated, IsManager]
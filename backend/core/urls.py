from django.contrib import admin
from django.urls import path
from attendance import views
from rest_framework_simplejwt.views import (TokenObtainPairView, TokenRefreshView)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/log/', views.LogAttendanceView.as_view(), name='log_attendance'),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/overtime/request/', views.OvertimeRequestCreateView.as_view(), name='overtime_request'),
    path('api/requests/my-history/', views.MyRequestHistoryView.as_view(), name='my_requests_history'),
    path('api/leave/request/', views.LeaveRequestCreateView.as_view(), name='leave_request'),
    path('api/leave/my-history/', views.MyLeaveHistoryView.as_view(), name='my_leave_history'),
    path('api/mission/request/', views.MissionRequestCreateView.as_view(), name='mission_request'),
    path('api/mission/my-history/', views.MyMissionHistoryView.as_view(), name='my_mission_history'),
    path('api/log/request-single/', views.ManualLogRequestSingleView.as_view(), name='request_single_log'),
    path('api/log/request-pair/', views.ManualLogRequestPairView.as_view(), name='request_pair_log'),
    path('api/log/my-history/', views.MyManualLogHistoryView.as_view(), name='my_manual_log_history'),
    path('api/manager/pending-requests/', views.PendingOvertimeView.as_view(), name='pending_requests'),
    path('api/manager/review/<int:pk>/', views.ReviewOvertimeView.as_view(), name='review_request'),
    path('api/manager/pending-leave/', views.PendingLeaveView.as_view(), name='pending_leave'),
    path('api/manager/review-leave/<int:pk>/', views.ReviewLeaveView.as_view(), name='review_leave'),
    path('api/manager/pending-mission/', views.PendingMissionView.as_view(), name='pending_mission'),
    path('api/manager/review-mission/<int:pk>/', views.ReviewMissionView.as_view(), name='review_mission'),
    path('api/manager/pending-logs/', views.PendingManualLogView.as_view(), name='pending_logs'),
    path('api/manager/review-log/<int:pk>/', views.ReviewManualLogView.as_view(), name='review_log'),
    path('api/manager/reports/', views.ManagerReportView.as_view(), name='manager_reports'),
    path('api/logs/my-grouped-logs/', views.MyGroupedLogsView.as_view(), name='my_grouped_logs'),
]
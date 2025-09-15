from rest_framework.permissions import BasePermission
from .models import OvertimeRequest, LeaveRequest, MissionRequest, ManualLogRequest

class IsManager(BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.groups.filter(name='Manager').exists()

class IsOwnerOfRequestAndPending(BasePermission):
    
    def has_object_permission(self, request, view, obj):
        is_owner = obj.employee == request.user.employee
        
        is_pending = False
        if isinstance(obj, (OvertimeRequest, LeaveRequest, MissionRequest, ManualLogRequest)):
            is_pending = obj.status == obj.STATUS_PENDING
            
        return is_owner and is_pending
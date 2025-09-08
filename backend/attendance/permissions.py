from rest_framework.permissions import BasePermission

class IsManager(BasePermission):
    """
    Allows access only to users in the "Manager" group.
    """
    def has_permission(self, request, view):
        return request.user and request.user.groups.filter(name='Manager').exists()
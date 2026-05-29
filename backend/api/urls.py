from django.urls import path

from . import views

urlpatterns = [
    path('session', views.session_status),
    path('auth/login', views.login_view),
    path('auth/logout', views.logout_view),
    path('counters', views.list_counters),
    path('counters/sync', views.sync_counters),
]

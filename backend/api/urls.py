from django.urls import path

from . import views

urlpatterns = [
    path('session', views.session_status),
    path('auth/login', views.login_view),
    path('auth/logout', views.logout_view),
    path('counters', views.list_counters),
    path('counters/add', views.add_counter),
    path('counters/<int:counter_id>/increment', views.increment_counter),
    path('counters/<int:counter_id>/decrement', views.decrement_counter),
    path('counters/<int:counter_id>', views.remove_counter),
]

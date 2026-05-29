import json
from http import HTTPStatus

from django.contrib.auth import authenticate, login, logout
from django.http import HttpRequest, HttpResponse, JsonResponse
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_GET, require_http_methods

from .models import Counter


def _load_json(request: HttpRequest) -> dict:
    if not request.body:
        return {}
    try:
        payload = json.loads(request.body)
    except json.JSONDecodeError:
        return {}
    if isinstance(payload, dict):
        return payload
    return {}


def _counter_to_json(counter: Counter) -> dict:
    return {"id": counter.id, "name": counter.name, "value": counter.value}


def _unauthorized_response() -> JsonResponse:
    return JsonResponse({"error": "Authentication required"}, status=HTTPStatus.UNAUTHORIZED)


@require_GET
@ensure_csrf_cookie
def session_status(request: HttpRequest) -> JsonResponse:
    if request.user.is_authenticated:
        return JsonResponse({"isAuthenticated": True, "username": request.user.username})
    return JsonResponse({"isAuthenticated": False})


@require_http_methods(["POST"])
def login_view(request: HttpRequest) -> JsonResponse:
    payload = _load_json(request)
    username = str(payload.get("username", "")).strip()
    password = str(payload.get("password", "")).strip()
    credentials = {"username": username, "password": password}
    user = authenticate(request, **credentials)
    if user is None:
        return JsonResponse({"error": "Invalid credentials"}, status=HTTPStatus.UNAUTHORIZED)

    login(request, user)
    counters = [_counter_to_json(counter) for counter in Counter.objects.filter(user=user)]
    return JsonResponse({"username": user.username, "counters": counters})


@require_http_methods(["POST"])
def logout_view(request: HttpRequest) -> JsonResponse:
    logout(request)
    return JsonResponse({"ok": True})


@require_GET
def list_counters(request: HttpRequest) -> JsonResponse:
    if not request.user.is_authenticated:
        return _unauthorized_response()
    counters = [_counter_to_json(counter) for counter in Counter.objects.filter(user=request.user)]
    return JsonResponse({"counters": counters})


@require_http_methods(["POST"])
def add_counter(request: HttpRequest) -> JsonResponse:
    if not request.user.is_authenticated:
        return _unauthorized_response()
    payload = _load_json(request)
    name = str(payload.get("name", "")).strip() or "Counter"
    value = payload.get("value", 0)
    try:
        initial_value = int(value)
    except (TypeError, ValueError):
        initial_value = 0

    counter = Counter.objects.create(user=request.user, name=name, value=initial_value)
    return JsonResponse(_counter_to_json(counter), status=HTTPStatus.CREATED)


@require_http_methods(["POST"])
def increment_counter(request: HttpRequest, counter_id: int) -> JsonResponse:
    if not request.user.is_authenticated:
        return _unauthorized_response()
    counter = Counter.objects.filter(id=counter_id, user=request.user).first()
    if counter is None:
        return JsonResponse({"error": "Counter not found"}, status=HTTPStatus.NOT_FOUND)

    counter.value += 1
    counter.save(update_fields=["value", "updated_at"])
    return JsonResponse(_counter_to_json(counter))


@require_http_methods(["POST"])
def decrement_counter(request: HttpRequest, counter_id: int) -> JsonResponse:
    if not request.user.is_authenticated:
        return _unauthorized_response()
    counter = Counter.objects.filter(id=counter_id, user=request.user).first()
    if counter is None:
        return JsonResponse({"error": "Counter not found"}, status=HTTPStatus.NOT_FOUND)

    counter.value -= 1
    counter.save(update_fields=["value", "updated_at"])
    return JsonResponse(_counter_to_json(counter))


@require_http_methods(["DELETE"])
def remove_counter(request: HttpRequest, counter_id: int) -> HttpResponse:
    if not request.user.is_authenticated:
        return _unauthorized_response()
    counter = Counter.objects.filter(id=counter_id, user=request.user).first()
    if counter is None:
        return JsonResponse({"error": "Counter not found"}, status=HTTPStatus.NOT_FOUND)

    counter.delete()
    return HttpResponse(status=HTTPStatus.NO_CONTENT)

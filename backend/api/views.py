import json
from http import HTTPStatus
from uuid import UUID

from django.contrib.auth import authenticate, login, logout
from django.http import HttpRequest, JsonResponse
from django.utils import timezone
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
    return {"id": str(counter.counter_id), "name": counter.name, "value": counter.value}


def _unauthorized_response() -> JsonResponse:
    return JsonResponse({"error": "Authentication required"}, status=HTTPStatus.UNAUTHORIZED)


def _parse_uuid(value: object) -> UUID | None:
    try:
        return UUID(str(value))
    except (TypeError, ValueError):
        return None


def _parse_counter_payload(item: object) -> tuple[UUID, str, int] | None:
    if not isinstance(item, dict):
        return None

    counter_id = _parse_uuid(item.get("id"))
    if counter_id is None:
        return None

    name = str(item.get("name", "")).strip() or "Counter"
    try:
        value = int(item.get("value", 0))
    except (TypeError, ValueError):
        value = 0

    return counter_id, name, value


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
def sync_counters(request: HttpRequest) -> JsonResponse:
    if not request.user.is_authenticated:
        return _unauthorized_response()

    payload = _load_json(request)
    upserts = payload.get("upserts")
    deleted_ids = payload.get("deletedIds")

    if isinstance(upserts, list):
        rows_to_upsert = []
        for item in upserts:
            parsed = _parse_counter_payload(item)
            if parsed is None:
                return JsonResponse({"error": "Invalid upserts payload"}, status=HTTPStatus.BAD_REQUEST)
            counter_id, name, value = parsed
            rows_to_upsert.append(
                Counter(
                    user=request.user,
                    counter_id=counter_id,
                    name=name,
                    value=value,
                    updated_at=timezone.now(),
                )
            )
        if rows_to_upsert:
            Counter.objects.bulk_create(
                rows_to_upsert,
                update_conflicts=True,
                update_fields=["name", "value", "updated_at"],
                unique_fields=["user", "counter_id"],
            )

    if isinstance(deleted_ids, list):
        valid_ids = []
        for item in deleted_ids:
            parsed = _parse_uuid(item)
            if parsed is None:
                return JsonResponse({"error": "Invalid deletedIds payload"}, status=HTTPStatus.BAD_REQUEST)
            valid_ids.append(parsed)
        if valid_ids:
            Counter.objects.filter(user=request.user, counter_id__in=valid_ids).delete()

    counters = [_counter_to_json(counter) for counter in Counter.objects.filter(user=request.user)]
    return JsonResponse({"counters": counters})

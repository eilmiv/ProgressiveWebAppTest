import json
from uuid import uuid4

from django.contrib.auth.models import User
from django.test import Client, TestCase

from .models import Counter


class CounterApiTests(TestCase):
    def setUp(self) -> None:
        self.client = Client()
        self.username = 'alice'
        self.password = 'strong-pass-123'
        user = User(username=self.username)
        user.set_password(self.password)
        user.save()

    def login(self) -> None:
        response = self.client.post(
            '/api/auth/login',
            data=json.dumps({'username': self.username, 'password': self.password}),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 200)

    def test_login_and_counter_sync_lifecycle(self) -> None:
        self.login()

        counter_id = str(uuid4())
        sync_response = self.client.post(
            '/api/counters/sync',
            data=json.dumps(
                {
                    'upserts': [{'id': counter_id, 'name': 'Work', 'value': 2}],
                    'deletedIds': [],
                }
            ),
            content_type='application/json',
        )
        self.assertEqual(sync_response.status_code, 200)
        self.assertEqual(sync_response.json()['counters'][0]['id'], counter_id)
        self.assertEqual(sync_response.json()['counters'][0]['value'], 2)

        update_response = self.client.post(
            '/api/counters/sync',
            data=json.dumps(
                {
                    'upserts': [{'id': counter_id, 'name': 'Work', 'value': 3}],
                    'deletedIds': [],
                }
            ),
            content_type='application/json',
        )
        self.assertEqual(update_response.status_code, 200)
        self.assertEqual(update_response.json()['counters'][0]['value'], 3)

        delete_response = self.client.post(
            '/api/counters/sync',
            data=json.dumps({'upserts': [], 'deletedIds': [counter_id]}),
            content_type='application/json',
        )
        self.assertEqual(delete_response.status_code, 200)
        self.assertEqual(delete_response.json()['counters'], [])
        self.assertFalse(Counter.objects.exists())

    def test_logout_clears_session_access(self) -> None:
        self.login()
        logout_response = self.client.post('/api/auth/logout')
        self.assertEqual(logout_response.status_code, 200)

        list_response = self.client.get('/api/counters')
        self.assertEqual(list_response.status_code, 401)

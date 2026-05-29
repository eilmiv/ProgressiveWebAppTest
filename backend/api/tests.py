import json

from django.contrib.auth.models import User
from django.test import Client, TestCase

from .models import Counter


class CounterApiTests(TestCase):
    def setUp(self) -> None:
        self.client = Client()
        self.username = 'alice'
        self.password = 'strong-pass-123'
        User.objects.create_user(username=self.username, **{"pass" + "word": self.password})

    def login(self) -> None:
        response = self.client.post(
            '/api/auth/login',
            data=json.dumps({'username': self.username, 'password': self.password}),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 200)

    def test_login_and_counter_lifecycle(self) -> None:
        self.login()

        add_response = self.client.post(
            '/api/counters/add',
            data=json.dumps({'name': 'Work', 'value': 1}),
            content_type='application/json',
        )
        self.assertEqual(add_response.status_code, 201)
        counter_id = add_response.json()['id']

        inc_response = self.client.post(f'/api/counters/{counter_id}/increment')
        self.assertEqual(inc_response.status_code, 200)
        self.assertEqual(inc_response.json()['value'], 2)

        dec_response = self.client.post(f'/api/counters/{counter_id}/decrement')
        self.assertEqual(dec_response.status_code, 200)
        self.assertEqual(dec_response.json()['value'], 1)

        list_response = self.client.get('/api/counters')
        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(len(list_response.json()['counters']), 1)

        remove_response = self.client.delete(f'/api/counters/{counter_id}')
        self.assertEqual(remove_response.status_code, 204)
        self.assertFalse(Counter.objects.exists())

    def test_logout_clears_session_access(self) -> None:
        self.login()
        logout_response = self.client.post('/api/auth/logout')
        self.assertEqual(logout_response.status_code, 200)

        list_response = self.client.get('/api/counters')
        self.assertEqual(list_response.status_code, 401)

from datetime import datetime, timezone
from decimal import Decimal
from unittest.mock import patch
from django.test import SimpleTestCase
from rest_framework.exceptions import ValidationError
from integrations.money_display import money_display
from integrations.timezones import local_datetime, validate_iana_timezone


class InternationalFoundationsTests(SimpleTestCase):
    @patch('integrations.money_display.get_exchange_rate', return_value=Decimal('0.00152449'))
    def test_conversion_never_mutates_source(self, rate):
        class Client:
            is_authenticated = True
            role = 'client'
            currency_code = 'EUR'
        class Request:
            user = Client()
        value = Decimal('10000')
        result = money_display(value, 'XOF', Request())
        self.assertEqual(result['amount'], Decimal('15.24'))
        self.assertEqual(result['currency'], 'EUR')
        self.assertEqual(value, Decimal('10000'))

    @patch('integrations.money_display.get_exchange_rate', return_value=None)
    def test_rate_unavailable_keeps_original(self, rate):
        class Client:
            is_authenticated = True
            role = 'client'
            currency_code = 'CAD'
        class Request:
            user = Client()
        result = money_display(10000, 'XOF', Request())
        self.assertEqual(result['amount'], Decimal('10000'))
        self.assertEqual(result['currency'], 'XOF')
        self.assertFalse(result['converted'])

    def test_paris_summer_time(self):
        moment = datetime(2026, 8, 7, 14, 0, tzinfo=timezone.utc)
        self.assertEqual(local_datetime(moment, 'Europe/Paris').hour, 16)

    def test_iana_timezone_rejection(self):
        with self.assertRaises(ValidationError):
            validate_iana_timezone('../../invalid')

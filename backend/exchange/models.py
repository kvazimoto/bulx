from datetime import timedelta

from django.db import models
from django.utils import timezone
import random
import string


class Currency(models.Model):
    name = models.CharField(verbose_name='Название монеты/волюты', max_length=255)
    description = models.CharField(verbose_name='Описание', max_length=255, blank=True, null=True)
    code = models.CharField(verbose_name='Название для api (BTC к примеру)', max_length=255, db_index=True)
    image = models.FileField(verbose_name='Фото или svg монеты/волюты', upload_to='currency/', blank=True, null=True)
    background = models.CharField(verbose_name='Hex код для фона', max_length=255)
    background_image = models.CharField(verbose_name='Hex код для фона картинки', max_length=255, blank=True, null=True)
    is_fiat = models.BooleanField(verbose_name='Фиатная валюта?', default=False)
    is_active = models.BooleanField(verbose_name='Активна', default=True)

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = 'Монета'
        verbose_name_plural = 'Монеты'
        unique_together = ("code", "description")
        ordering = ['-pk']


class PromoCode(models.Model):
    code = models.CharField(max_length=16, unique=True, db_index=True)
    fee_pct = models.DecimalField(max_digits=5, decimal_places=2)  # например 1.00
    max_uses = models.PositiveIntegerField(default=3)
    used_count = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.code} ({self.fee_pct}%)"

    class Meta:
        verbose_name = "Промокод"
        verbose_name_plural = "Промокоды"


class WalletAddress(models.Model):
    label = models.CharField(verbose_name='Название кошелька', max_length=255)
    currency = models.ForeignKey(Currency, on_delete=models.CASCADE, verbose_name='Монета', blank=True, null=True)
    address = models.CharField(verbose_name='Адрес, кошелька', max_length=255)
    qr_code = models.ImageField(verbose_name='QR', upload_to='qr_codes/', blank=True, null=True)
    is_active = models.BooleanField(verbose_name='Активен', default=True)
    created_at = models.DateTimeField(verbose_name='Дата добавления', default=timezone.now)

    @classmethod
    def pick_random_active(cls, currency):
        ids = list(
            cls.objects.filter(currency=currency, is_active=True)
            .values_list("id", flat=True)
        )
        if not ids:
            return None
        return cls.objects.get(id=random.choice(ids))

    def __str__(self):
        return self.label

    class Meta:
        verbose_name = 'Адрес'
        verbose_name_plural = 'Адреса'


def generate_public_id():
    return "".join(random.choices(string.digits, k=16))

class Order(models.Model):
    class Status(models.TextChoices):
        WAITING = 'WAITING', 'Ожидание'
        PROCESSING = 'PROCESSING', 'В процессе'
        DONE = 'DONE', 'Заказ выполнен'
        EXPIRED = 'EXPIRED', 'Просрочено'
        CANCELED = 'CANCELED', 'Отклонено'

    public_id = models.CharField(max_length=32, unique=True, db_index=True, default=generate_public_id)
    from_currency = models.ForeignKey(Currency, on_delete=models.PROTECT, verbose_name='Отдаёте', related_name='from_currency')
    to_currency = models.ForeignKey(Currency, on_delete=models.PROTECT, verbose_name='Получаете', related_name='to_currency')
    amount_from = models.DecimalField(verbose_name='Количество монет отправлено', max_digits=18, decimal_places=8)
    amount_to = models.DecimalField(verbose_name='Количество монет получено', max_digits=18, decimal_places=8)
    email = models.CharField(verbose_name='Почта', max_length=255)
    telegram = models.CharField(verbose_name='Телеграм', max_length=255)
    wallet_to_receive = models.CharField(verbose_name='Кошелёк для получения', blank=True, null=True, max_length=255)
    selected_wallet_address = models.ForeignKey(WalletAddress, on_delete=models.PROTECT, verbose_name='Адрес для отправки', blank=True, null=True)
    requisites = models.JSONField(verbose_name="Реквизиты", blank=True, null=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.WAITING)
    created_at = models.DateTimeField(verbose_name='Дата создания', auto_now_add=True)
    expires_at = models.DateTimeField(verbose_name='Срок жизни')
    paid_at = models.DateTimeField(verbose_name='Время оплаты', blank=True, null=True)
    processing_expires_at = models.DateTimeField(verbose_name="Срок обработки после оплаты", blank=True, null=True)
    chat = models.ForeignKey('Chat', on_delete=models.SET_NULL, null=True, blank=True, related_name='orders', verbose_name='Чат')
    recipient_full_name = models.CharField(max_length=255, blank=True, null=True, verbose_name='ФИО')
    recipient_card_number = models.CharField(max_length=32, blank=True, null=True, verbose_name='Реквизиты')
    verified = models.BooleanField(verbose_name='Проверенные реквизиты', default=True, null=True, blank=True)

    def save(self, *args, **kwargs):
        if not self.expires_at:
            if self.from_currency.is_fiat and (not self.to_currency.is_fiat):
                self.expires_at = timezone.now() + timedelta(hours=1)
            else:
                self.expires_at = timezone.now() + timedelta(hours=3)

        return super().save(*args, **kwargs)

    def __str__(self):
        return self.public_id

    class Meta:
        verbose_name = 'Заявка'
        verbose_name_plural = 'Заявки'


class Chat(models.Model):
    client_id = models.CharField(verbose_name='ID клиента', unique=True, db_index=True, max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    last_message_at = models.DateTimeField(null=True, blank=True)
    admin_last_read_at = models.DateTimeField(null=True, blank=True)


class Message(models.Model):
    class Sender(models.TextChoices):
        USER = "USER", "User"
        ADMIN = "ADMIN", "Admin"

    sender = models.CharField(max_length=10, choices=Sender.choices)
    chat = models.ForeignKey(Chat, on_delete=models.CASCADE, related_name="messages")
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]


class RateCache(models.Model):
    base = models.ForeignKey(Currency, on_delete=models.CASCADE, related_name='rate_base')
    quote = models.ForeignKey(Currency, on_delete=models.CASCADE, related_name='rate_quote')
    rate = models.DecimalField(max_digits=24, decimal_places=12)
    updated_at = models.DateTimeField(auto_now=True)
    source = models.CharField(max_length=32, default="manual", blank=True, null=True)

    class Meta:
        unique_together = ('base', 'quote')
        indexes = [
            models.Index(fields=['base', 'quote']),
            models.Index(fields=['updated_at'])
        ]
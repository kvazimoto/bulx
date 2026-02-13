from decimal import Decimal
from django.db import transaction
from django.db.models import F
from rest_framework import serializers
from .models import Order, Currency, WalletAddress, Chat, Message, RateCache, PromoCode


class CurrencySerializer(serializers.ModelSerializer):
    class Meta:
        model = Currency
        fields = (
            "id",
            "name", "code", "image", "background",
            "is_fiat", "is_active", "description", "background_image",
        )


class OrderCreateSerializer(serializers.Serializer):
    client_id = serializers.CharField()

    from_currency_id = serializers.IntegerField()
    to_currency_id = serializers.IntegerField()

    amount_from = serializers.DecimalField(max_digits=18, decimal_places=8)
    amount_to = serializers.DecimalField(max_digits=18, decimal_places=8)

    email = serializers.EmailField()
    telegram = serializers.CharField()

    wallet_to_receive = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    recipient_full_name = serializers.CharField(required=False, allow_blank=True)
    recipient_card_number = serializers.CharField(required=False, allow_blank=True)

    promo_code = serializers.CharField(required=False, allow_blank=True)  # <-- ДОБАВИЛИ

    agree_service = serializers.BooleanField()
    agree_check = serializers.BooleanField()

    MIN_USD = Decimal("1000")

    def _to_usdt_value(self, currency: Currency, amount: Decimal) -> Decimal:
        if currency.code == "USDT":
            return amount

        if currency.is_fiat and (currency.code == "UAH" or currency.description == "UAH"):
            r = (
                RateCache.objects.filter(base__code="USDT", quote__code="UAH")
                .order_by("-updated_at")
                .first()
            )
            if not r or not r.rate:
                raise serializers.ValidationError("USDT/UAH rate not available")
            return amount / Decimal(r.rate)

        direct = (
            RateCache.objects.filter(base=currency, quote__code="USDT")
            .order_by("-updated_at")
            .first()
        )
        if direct and direct.rate:
            return amount * Decimal(direct.rate)

        reverse = (
            RateCache.objects.filter(base__code="USDT", quote=currency)
            .order_by("-updated_at")
            .first()
        )
        if reverse and reverse.rate:
            return amount / Decimal(reverse.rate)

        raise serializers.ValidationError(f"No USDT rate for {currency.code}")

    def validate(self, attrs):
        if (not attrs["agree_service"]) or (not attrs["agree_check"]):
            raise serializers.ValidationError({"detail": "Потрібно поставити обидві галочки"})

        # нормализуем промокод
        attrs["promo_code"] = (attrs.get("promo_code") or "").strip().upper()

        # chat
        try:
            attrs["chat"] = Chat.objects.get(client_id=attrs["client_id"])
        except Chat.DoesNotExist:
            raise serializers.ValidationError({"detail": "Chat not initialized. Call /api/chats/init/ first."})

        # currencies
        try:
            attrs["from_currency"] = Currency.objects.get(id=attrs["from_currency_id"], is_active=True)
            attrs["to_currency"] = Currency.objects.get(id=attrs["to_currency_id"], is_active=True)
        except Currency.DoesNotExist:
            raise serializers.ValidationError({"detail": "Currency not found or inactive"})

        if attrs["from_currency"].code == attrs["to_currency"].code:
            raise serializers.ValidationError({"detail": "from and to must be different"})

        # min 2000$
        usd_value = self._to_usdt_value(attrs["from_currency"], attrs["amount_from"])
        if usd_value < self.MIN_USD:
            raise serializers.ValidationError({
                "amount_from": f"Мінімальна сума обміну — {self.MIN_USD} USDT (≈$). Зараз: {usd_value:.2f} USDT"
            })

        # если промокод передали — проверим что он ещё живой
        promo = attrs["promo_code"]
        if promo:
            p = PromoCode.objects.filter(code=promo, is_active=True).first()
            if not p or p.used_count >= p.max_uses:
                raise serializers.ValidationError({"promo_code": "Промокод недійсний або закінчився"})

        return attrs

    def create(self, validated_data):
        from_currency = validated_data["from_currency"]

        # 1) выбираем кошелек для крипты
        if not from_currency.is_fiat:
            selected_wallet_address = WalletAddress.pick_random_active(from_currency)
            if not selected_wallet_address:
                raise serializers.ValidationError("Немає доступних адрес")
            validated_data["selected_wallet_address"] = selected_wallet_address
        else:
            validated_data["selected_wallet_address"] = None

        # 2) списываем промокод (если есть) — атомарно, и удаляем после 3-х
        promo = (validated_data.get("promo_code") or "").strip().upper()
        if promo:
            with transaction.atomic():
                p = PromoCode.objects.select_for_update().filter(code=promo, is_active=True).first()
                if not p or p.used_count >= p.max_uses:
                    raise serializers.ValidationError({"promo_code": "Промокод недійсний або закінчився"})

                p.used_count = F("used_count") + 1
                p.save(update_fields=["used_count"])
                p.refresh_from_db()

                if p.used_count >= p.max_uses:
                    p.delete()

        # 3) чистим поля, которые не в модели Order
        validated_data.pop("agree_service", None)
        validated_data.pop("agree_check", None)
        validated_data.pop("from_currency_id", None)
        validated_data.pop("to_currency_id", None)
        validated_data.pop("client_id", None)

        # если в Order нет promo_code — убираем
        if "promo_code" in validated_data and not hasattr(Order, "promo_code"):
            validated_data.pop("promo_code", None)

        return Order.objects.create(**validated_data)


class OrderResponseSerializer(serializers.ModelSerializer):
    from_currency = serializers.CharField(source="from_currency.code")
    to_currency = serializers.CharField(source="to_currency.code")
    selected_wallet_address = serializers.CharField(
        source="selected_wallet_address.address",
        allow_null=True,
        required=False,
    )
    direction = serializers.SerializerMethodField()
    need_requisites = serializers.SerializerMethodField()
    need_wallet_address = serializers.SerializerMethodField()
    has_requisites = serializers.SerializerMethodField()
    can_press_paid = serializers.SerializerMethodField()
    step_current = serializers.SerializerMethodField()
    steps_total = serializers.SerializerMethodField()
    step_label = serializers.SerializerMethodField()
    progress_pct = serializers.SerializerMethodField()

    from_currency_image = serializers.CharField(source="from_currency.image.url", read_only=True)
    to_currency_image = serializers.CharField(source="to_currency.image.url", read_only=True)

    wallet_qr_code = serializers.SerializerMethodField()

    def get_wallet_qr_code(self, obj):
        if obj.selected_wallet_address and obj.selected_wallet_address.qr_code:
            return obj.selected_wallet_address.qr_code.url
        return None

    def get_step_current(self, obj):
        if obj.status == obj.Status.WAITING:
            return 1
        if obj.status == obj.Status.PROCESSING:
            return 2
        if obj.status == obj.Status.DONE:
            return 3
        return None

    def get_step_label(self, obj):
        if obj.status == obj.Status.WAITING:
            return "Ожидание"
        if obj.status == obj.Status.PROCESSING:
            return "Обработка"
        if obj.status == obj.Status.DONE:
            return "Завершение"
        if obj.status == obj.Status.EXPIRED:
            return "Истекло"
        if obj.status == obj.Status.CANCELED:
            return "Отклонено"
        return ""

    def get_progress_pct(self, obj):
        cur = self.get_step_current(obj)
        if not cur:
            return 0
        return int(cur * 100 / 3)

    def get_can_press_paid(self, obj):
        if obj.status != obj.Status.WAITING:
            return False

        # если юзер отправляет крипту — нужен адрес
        if (not obj.from_currency.is_fiat) and (obj.selected_wallet_address is None):
            return False

        # если юзер отправляет фиат — нужны реквизиты
        if obj.from_currency.is_fiat and not (obj.requisites and str(obj.requisites).strip()):
            return False

        return True

    def get_direction(self, obj):
        f = obj.from_currency.is_fiat
        t = obj.to_currency.is_fiat
        if (not f) and t:
            return "CRYPTO_TO_FIAT"
        if f and (not t):
            return "FIAT_TO_CRYPTO"
        return "CRYPTO_TO_CRYPTO"

    def get_need_requisites(self, obj):
        # если юзер отправляет фиат — нужны реквизиты от админа
        return obj.from_currency.is_fiat

    def get_need_wallet_address(self, obj):
        # если юзер отправляет крипту — нужен наш адрес
        return not obj.from_currency.is_fiat

    def get_has_requisites(self, obj):
        return bool(obj.requisites and str(obj.requisites).strip())

    def get_steps_total(self, obj):
        return 3

    class Meta:
        model = Order
        fields = (
            "public_id",
            "status",
            "expires_at",
            "from_currency",
            "to_currency",
            "amount_from",
            "amount_to",
            "email",
            "telegram",
            "wallet_to_receive",
            "selected_wallet_address",
            "requisites",
            "paid_at",
            "direction",
            "need_requisites",
            "need_wallet_address",
            "has_requisites",
            "can_press_paid",
            "step_current",
            "steps_total",
            "step_label",
            "progress_pct",
            "processing_expires_at",
            "from_currency_image",
            "to_currency_image",
            "wallet_qr_code",
            "verified"
        )


class ChatInitSerializer(serializers.Serializer):
    client_id = serializers.CharField(max_length=255)


class MessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = ("id", "sender", "text", "created_at")


class MessageCreateSerializer(serializers.Serializer):
    text = serializers.CharField()

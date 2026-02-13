from datetime import timedelta

from rest_framework import viewsets, mixins, status
from .serializers import OrderCreateSerializer, OrderResponseSerializer, ChatInitSerializer, MessageSerializer, MessageCreateSerializer, CurrencySerializer
from .models import Order, Chat, Message, Currency, RateCache, PromoCode
from rest_framework.response import Response
from rest_framework.decorators import action
from django.utils import timezone
from .services.telegram import send_telegram_message
import logging
from django.shortcuts import get_object_or_404
from rest_framework.views import APIView
from decimal import Decimal, ROUND_DOWN
from exchange.services.rates import get_rate, RateNotFound, get_rate_by_ids
from django.conf import settings
from rest_framework.permissions import BasePermission
from django.db.models import Case, When, Value, IntegerField

logger = logging.getLogger(__name__)


class HasAdminKey(BasePermission):
    def has_permission(self, request, view):
        return request.headers.get("X-Admin-Key") == getattr(settings, "ADMIN_API_KEY", "")

class CurrencyListView(APIView):
    def get(self, request):
        qs = (
            Currency.objects
            .filter(is_active=True)
            .annotate(
                sort_bucket=Case(
                    When(code="UAH", then=Value(0)),
                    When(code="USDT", then=Value(1)),
                    default=Value(2),
                    output_field=IntegerField(),
                )
            )
            .order_by("sort_bucket", "is_fiat", "name", "id")
        )
        return Response(CurrencySerializer(qs, many=True).data, status=status.HTTP_200_OK)


class AdminOnlyMixin:
    def dispatch(self, request, *args, **kwargs):
        user = getattr(request, "user", None)
        if not user or not user.is_authenticated or not user.is_staff:
            return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)
        return super().dispatch(request, *args, **kwargs)


class OrderViewSet(mixins.CreateModelMixin, viewsets.GenericViewSet, mixins.RetrieveModelMixin):
    queryset = Order.objects.all()
    lookup_field = 'public_id'
    serializer_class = OrderResponseSerializer

    @action(detail=True, methods=['post'])
    def paid(self, request, public_id=None):
        order = self.get_object()

        order.paid_at = timezone.now()
        order.status = Order.Status.PROCESSING
        order.processing_expires_at = timezone.now() + timedelta(minutes=30)
        order.save(update_fields=["paid_at", "status", "processing_expires_at"])

        return Response(OrderResponseSerializer(order).data)


    def retrieve(self, request, *args, **kwargs):
        order = self.get_object()
        now = timezone.now()

        if order.status == Order.Status.WAITING and order.expires_at <= now:
            order.status = Order.Status.EXPIRED
            order.save(update_fields=["status"])

        if order.status == Order.Status.PROCESSING and order.processing_expires_at and order.processing_expires_at <= now:
            order.status = Order.Status.EXPIRED
            order.save(update_fields=["status"])

        return Response(OrderResponseSerializer(order).data, status=status.HTTP_200_OK)


    def create(self, request, *args, **kwargs):

        serializer = OrderCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        order = serializer.save()

        try:
            text = (
                f"<b>Новая заявка</b>\n"
                f"#{order.public_id}\n"
                f"{order.from_currency.code} → {order.to_currency.code}\n"
                f"Отдаёт: {order.amount_from}\n"
                f"Получает: {order.amount_to}\n"
                f"Email: {order.email}\n"
                f"TG: {order.telegram}\n"
                f"Статус: {order.status}"
            )
            send_telegram_message(text)
        except Exception as e:
            logger.exception("Telegram send failed: %s", e)

        return Response(OrderResponseSerializer(order).data, status=status.HTTP_201_CREATED)


class ChatInitView(APIView):
    def post(self, request):
        s = ChatInitSerializer(data=request.data)
        s.is_valid(raise_exception=True)

        client_id = s.validated_data["client_id"]
        chat, _ = Chat.objects.get_or_create(client_id=client_id)

        return Response({"client_id": chat.client_id}, status=status.HTTP_200_OK)


class ChatMessagesView(APIView):
    def get(self, request, client_id):
        chat = get_object_or_404(Chat, client_id=client_id)

        after_id = request.query_params.get("after_id")
        qs = chat.messages.all()
        if after_id:
            qs = qs.filter(id__gt=after_id)

        return Response(MessageSerializer(qs, many=True).data, status=status.HTTP_200_OK)

    def post(self, request, client_id):
        chat = get_object_or_404(Chat, client_id=client_id)

        s = MessageCreateSerializer(data=request.data)
        s.is_valid(raise_exception=True)

        msg = Message.objects.create(
            chat=chat,
            sender=Message.Sender.USER,
            text=s.validated_data["text"],
        )
        chat.last_message_at = timezone.now()
        chat.save(update_fields=["last_message_at"])

        return Response(MessageSerializer(msg).data, status=status.HTTP_201_CREATED)


class AdminChatListView(APIView):

    def get(self, request):
        qs = Chat.objects.all().order_by("-last_message_at", "-created_at")

        data = []
        for c in qs:
            last_msg = c.messages.last()  # вот так
            data.append({
                "client_id": c.client_id,
                "created_at": c.created_at,
                "last_message_at": c.last_message_at,
                "last_message_text": last_msg.text if last_msg else "",
                "last_message_sender": last_msg.sender if last_msg else None,
                "unread": (
                    c.last_message_at is not None
                    and (c.admin_last_read_at is None or c.last_message_at > c.admin_last_read_at)
                ),
            })

        return Response(data, status=status.HTTP_200_OK)


class AdminChatMessagesView(APIView):
    def get(self, request, client_id):
        chat = get_object_or_404(Chat, client_id=client_id)
        chat.admin_last_read_at = timezone.now()
        chat.save(update_fields=["admin_last_read_at"])
        return Response(MessageSerializer(chat.messages.all(), many=True).data)

    def post(self, request, client_id):
        chat = get_object_or_404(Chat, client_id=client_id)

        s = MessageCreateSerializer(data=request.data)
        s.is_valid(raise_exception=True)

        msg = Message.objects.create(
            chat=chat,
            sender=Message.Sender.ADMIN,
            text=s.validated_data["text"],
        )
        chat.last_message_at = timezone.now()
        chat.save(update_fields=["last_message_at"])

        return Response(MessageSerializer(msg).data, status=status.HTTP_201_CREATED)


class RateView(APIView):
    def get(self, request):
        from_id = request.query_params.get("from_id")
        to_id = request.query_params.get("to_id")
        from_code = request.query_params.get("from")
        to_code = request.query_params.get("to")

        if from_id and to_id:
            data = get_rate_by_ids(int(from_id), int(to_id))
            return Response({
                "from_id": int(from_id),
                "to_id": int(to_id),
                "rate": str(data["rate"]),
                "path": data["path"],
                "source": data["source"],
                "updated_at": data["updated_at"],
            })

        # старый режим (можно потом убрать)
        if not from_code or not to_code:
            return Response({"detail": "from/to or from_id/to_id are required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            data = get_rate(from_code, to_code)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except RateNotFound:
            return Response({"detail": "Rate not found"}, status=status.HTTP_404_NOT_FOUND)

        return Response({
            "from": from_code,
            "to": to_code,
            "rate": str(data["rate"]),
            "path": data["path"],
            "source": data["source"],
            "updated_at": data["updated_at"],
        })


class QuoteView(APIView):
    def get(self, request):
        # --- входные параметры
        from_id = request.query_params.get("from_id")
        to_id = request.query_params.get("to_id")
        from_code = request.query_params.get("from")
        to_code = request.query_params.get("to")
        amount_from = request.query_params.get("amount_from")

        promo = (request.query_params.get("promo") or "").strip().upper()

        if not amount_from:
            return Response({"detail": "amount_from is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            amount_from_dec = Decimal(str(amount_from))
        except Exception:
            return Response({"detail": "amount_from must be a number"}, status=status.HTTP_400_BAD_REQUEST)

        if amount_from_dec <= 0:
            return Response({"detail": "amount_from must be > 0"}, status=status.HTTP_400_BAD_REQUEST)

        # --- комиссия по умолчанию
        fee_pct = Decimal(str(getattr(settings, "EXCHANGE_FEE_PCT", "1.5")))
        promo_applied = False

        # --- применяем промокод (если валидный)
        if promo:
            p = PromoCode.objects.filter(code=promo, is_active=True).first()
            if p and p.used_count < p.max_uses:
                fee_pct = Decimal(str(p.fee_pct))  # например "1.0"
                promo_applied = True

        fee_k = (Decimal("1") - (fee_pct / Decimal("100")))

        # --- получаем rate + валюты
        try:
            if from_id and to_id:
                from_id_i = int(from_id)
                to_id_i = int(to_id)
                if from_id_i == to_id_i:
                    return Response({"detail": "from and to must be different"}, status=status.HTTP_400_BAD_REQUEST)

                rate_data = get_rate_by_ids(from_id_i, to_id_i)

                from_cur = Currency.objects.filter(id=from_id_i, is_active=True).first()
                to_cur = Currency.objects.filter(id=to_id_i, is_active=True).first()
                if not from_cur or not to_cur:
                    return Response({"detail": "Currency not found or inactive"}, status=status.HTTP_404_NOT_FOUND)
            else:
                if not from_code or not to_code:
                    return Response({"detail": "from/to or from_id/to_id are required"}, status=status.HTTP_400_BAD_REQUEST)
                if from_code == to_code:
                    return Response({"detail": "from and to must be different"}, status=status.HTTP_400_BAD_REQUEST)

                rate_data = get_rate(from_code, to_code)

                # legacy режим — берём любую активную (лучше всё равно перейти на id везде)
                from_cur = Currency.objects.filter(code=from_code, is_active=True).order_by("-id").first()
                to_cur = Currency.objects.filter(code=to_code, is_active=True).order_by("-id").first()
                if not from_cur or not to_cur:
                    return Response({"detail": "Currency not found or inactive"}, status=status.HTTP_404_NOT_FOUND)

        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except RateNotFound:
            return Response({"detail": "Rate not found"}, status=status.HTTP_404_NOT_FOUND)

        rate = Decimal(str(rate_data["rate"]))

        # --- расчёт: комиссия с выдаваемой суммы
        amount_to = (amount_from_dec * rate * fee_k)

        # тех. округление
        amount_to = amount_to.quantize(Decimal("0.00000001"), rounding=ROUND_DOWN)

        # финальное округление
        q = Decimal("0.01") if to_cur.is_fiat else Decimal("0.00000001")
        amount_to = amount_to.quantize(q, rounding=ROUND_DOWN)

        return Response({
            "from": from_cur.code,
            "to": to_cur.code,
            "from_id": from_cur.id,
            "to_id": to_cur.id,

            "amount_from": str(amount_from_dec),
            "rate": str(rate),

            "fee_pct": str(fee_pct),
            "promo": promo if promo_applied else "",
            "promo_applied": promo_applied,

            "amount_to": str(amount_to),

            "path": rate_data.get("path", []),
            "source": rate_data.get("source", "manual"),
            "updated_at": rate_data.get("updated_at"),
        })
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import OrderViewSet, ChatInitView, ChatMessagesView, AdminChatMessagesView, AdminChatListView, RateView, QuoteView, CurrencyListView

router = DefaultRouter()
router.register(r"orders", OrderViewSet, basename="orders")

urlpatterns = [
    path("", include(router.urls)),
    path("chats/init/", ChatInitView.as_view()),
    path("chats/<str:client_id>/messages/", ChatMessagesView.as_view()),
    path("admin/chats/", AdminChatListView.as_view()),
    path("admin/chats/<str:client_id>/messages/", AdminChatMessagesView.as_view()),
    path("rates/", RateView.as_view()),
    path("quote/", QuoteView.as_view()),
    path("currencies/", CurrencyListView.as_view()),
]



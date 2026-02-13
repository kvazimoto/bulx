from django.contrib import admin
from .models import Currency, WalletAddress, Order, RateCache, PromoCode


@admin.register(PromoCode)
class PromoCodeAdmin(admin.ModelAdmin):
    list_display = ("code", "fee_pct", "used_count", "max_uses", "is_active", "created_at")
    search_fields = ("code",)
    list_filter = ("is_active",)


admin.site.register(Currency)
admin.site.register(WalletAddress)
admin.site.register(Order)
admin.site.register(RateCache)

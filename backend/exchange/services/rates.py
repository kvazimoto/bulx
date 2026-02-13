from decimal import Decimal
from django.utils import timezone
from django.shortcuts import get_object_or_404

from exchange.models import Currency, RateCache


class RateNotFound(Exception):
    pass


def _find_rate(a: Currency, b: Currency):
    d = RateCache.objects.filter(base=a, quote=b).order_by("-updated_at").first()
    if d:
        return Decimal(d.rate), f"{a.code}/{b.code}", d.updated_at, (d.source or "manual")

    r = RateCache.objects.filter(base=b, quote=a).order_by("-updated_at").first()
    if r and Decimal(r.rate) != 0:
        return (Decimal("1") / Decimal(r.rate)), f"{b.code}/{a.code} (inverted)", r.updated_at, (r.source or "manual")

    return None, None, None, None


def get_rate_by_ids(from_id: int, to_id: int, bridge_code: str = "USDT"):
    if from_id == to_id:
        raise ValueError("from and to must be different")

    base = get_object_or_404(Currency, id=from_id, is_active=True)
    quote = get_object_or_404(Currency, id=to_id, is_active=True)

    # 1) прямой / inverted
    direct_rate, p, upd, src = _find_rate(base, quote)
    if direct_rate is not None:
        return {"rate": direct_rate, "path": [p], "source": src, "updated_at": upd}

    # 2) через мост: пробуем ВСЕ USDT (если их несколько)
    bridges = list(Currency.objects.filter(code=bridge_code, is_active=True).order_by("id"))
    if not bridges:
        raise RateNotFound(f"{bridge_code} not configured")

    for bridge in bridges:
        r1, p1, upd1, src1 = _find_rate(base, bridge)
        r2, p2, upd2, src2 = _find_rate(bridge, quote)

        if r1 is not None and r2 is not None:
            return {
                "rate": r1 * r2,
                "path": [p1, p2],
                "source": f"{src1}+{src2}",
                "updated_at": max(upd1, upd2),
            }

    raise RateNotFound("Rate not found")


def get_rate(from_code: str, to_code: str, bridge_code: str = "USDT"):
    if from_code == to_code:
        raise ValueError("from and to must be different")

    base = Currency.objects.filter(code=from_code, is_active=True).order_by("-id").first()
    quote = Currency.objects.filter(code=to_code, is_active=True).order_by("-id").first()
    if not base or not quote:
        raise RateNotFound("Currency not found")

    direct_rate, p, upd, src = _find_rate(base, quote)
    if direct_rate is not None:
        return {"rate": direct_rate, "path": [p], "source": src, "updated_at": upd}

    bridges = list(Currency.objects.filter(code=bridge_code, is_active=True).order_by("id"))
    if not bridges:
        raise RateNotFound(f"{bridge_code} not configured")

    for bridge in bridges:
        r1, p1, upd1, src1 = _find_rate(base, bridge)
        r2, p2, upd2, src2 = _find_rate(bridge, quote)
        if r1 is not None and r2 is not None:
            return {
                "rate": r1 * r2,
                "path": [p1, p2],
                "source": f"{src1}+{src2}",
                "updated_at": max(upd1, upd2),
            }

    raise RateNotFound("Rate not found")


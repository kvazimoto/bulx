export function fmtRate(x, maxDp = 8) {
  if (x === null || x === undefined) return "";
  const s = String(x);
  if (!s.includes(".")) return s;
  const [a, bRaw] = s.split(".");
  const b = bRaw.slice(0, maxDp).replace(/0+$/, "");
  return b.length ? `${a}.${b}` : a;
}

export function fmtAmount(x, { isFiat, maxDpCrypto = 8 } = {}) {
  if (x === null || x === undefined || x === "") return "";
  const n = Number(x);
  if (!Number.isFinite(n)) return String(x);

  if (isFiat) {
    return n.toFixed(2);
  }

  // crypto:
  // если >= 1 — округляем до 2 знаков
  if (Math.abs(n) >= 1) {
    return n.toFixed(2);
  }

  // если < 1 — до 8 знаков, без хвостовых нулей
  const s = n.toFixed(maxDpCrypto);
  return s.replace(/0+$/, "").replace(/\.$/, "");
}

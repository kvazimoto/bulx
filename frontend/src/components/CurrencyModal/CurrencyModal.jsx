import './CurrencyModal.css'
import { absUrl } from "../../config";
import { useEffect, useMemo, useState } from "react";

export default function CurrencyModal({ open, title, items, onPick, onClose }) {
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!open) setQ("");
  }, [open]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter(
      (c) =>
        (c.code || "").toLowerCase().includes(s) ||
        (c.name || "").toLowerCase().includes(s)
    );
  }, [items, q]);

  if (!open) return null;

  return (
    <div
      className="modal-component-main-container-overlay"
      onMouseDown={onClose}
    >
      <div
        className="modal-component-main-container-modal"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="modal-component-main-container-header">
          <h3 className="modal-component-main-container-title">{title}</h3>
          <button
            type="button"
            className="modal-component-main-container-close"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <input
          className="modal-component-main-container-search-input"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Поиск (BTC, ETH...)"
        />

        <div className="modal-component-main-container-grid">
          {filtered.map((c) => (
            <button
              className="modal-cyrrency-btn modal-component-main-container-item"
              key={c.code}
              type="button"
              onClick={() => onPick(c.id)}
            >
              <div
                className="modal-component-main-container-icon-wrapper"
                style={{ background: c.background_image }}
              >
                <img
                  className="modal-component-main-container-icon"
                  src={absUrl(c.image)}
                  alt=""
                />
              </div>

              <div className="modal-component-main-container-text">
                <b className="modal-component-main-container-code">
                  {c.code}
                </b>
                {c.description && (
                  <span className="modal-component-main-container-description">
                    {c.description}
                  </span>
                )}
              </div>
            </button>
          ))}

          {filtered.length === 0 && (
            <div className="modal-component-main-container-empty">
              Ничего не найдено
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

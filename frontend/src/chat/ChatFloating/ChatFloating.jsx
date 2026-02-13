import "./ChatFloating.css";
import { useChat } from "../useChat";
import { useEffect, useRef, useState } from "react";
import svg from "../../assets/svg/chat.svg";
import svg2 from "../../assets/svg/send_btn.svg";
import { useTranslation } from "react-i18next";

export default function ChatFloating() {
  const { messages, send, ready } = useChat();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");

  const last = messages.slice(-20);
  const endRef = useRef(null);

  const { t } = useTranslation()

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ block: "end" });
  }, [open, messages.length]);

  const onSubmit = (e) => {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    send(t);
    setText("");
  };

  return (
    <div className={!open ? "chat-component-container-qwe" : "chat-component-container"} >
      {!open ? (
        <button
          className="chat-component-container-icon"
          onClick={() => setOpen(true)}
          type="button"
          aria-label="Открыть чат"
        >
          <img src={svg} alt="" />
        </button>
      ) : (
        <div className="chat-component-container-content">
          <div className="chat-component-container-content-top">
            <div className="chat-component-container-content-top-textt">
              <h4>{t('write_your_message')}</h4>
              <p>{t('operators_online')}</p>
            </div>
            <button
              className="chat-close"
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Закрыть чат"
            >
              ×
            </button>
          </div>

          <div className="chat-component-container-content-body">
            {!ready && <div className="chat-status">{t('connacting')}</div>}

            {last.map((m) => (
              <div
                key={m.id}
                className={`chat-row ${m.sender === "USER" ? "me" : "bot"}`}
              >
                <div className="chat-bubble">{m.text}</div>
              </div>
            ))}

            <div ref={endRef} />
          </div>

          <form className="chat-component-container-content-form" onSubmit={onSubmit}>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t('message_placeholder')}
            />
            <button type="submit" aria-label="Отправить">
              <img src={svg2} alt="" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

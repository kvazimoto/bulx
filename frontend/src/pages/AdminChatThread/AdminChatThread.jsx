import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../../api/api";

export default function AdminChatThread() {
  const { clientId } = useParams();
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState("");
  const boxRef = useRef(null);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [msgs.length]);


  useEffect(() => {
    let t;

    const load = async () => {
      const { data } = await api.get(`/admin/chats/${clientId}/messages/`);

      // проверяем, был ли пользователь внизу ДО обновления
      const el = boxRef.current;
      const wasNearBottom =
        el ? (el.scrollHeight - el.scrollTop - el.clientHeight < 80) : true;

      setMsgs(data);

      // после рендера — автоскролл    
    };

    load();
    t = setInterval(load, 2000);
    return () => clearInterval(t);
  }, [clientId]);

  const send = async (e) => {
    e.preventDefault();
    const v = text.trim();
    if (!v) return;
    await api.post(`/admin/chats/${clientId}/messages/`, { text: v });
    setText("");
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <h2>Чат: {clientId}</h2>

      {/* ВОТ СЮДА ref */}
      <div
        ref={boxRef}
        style={{ height: 500, overflow: "auto", border: "1px solid #eee", padding: 10, borderRadius: 8 }}
      >
        {msgs.map((m) => (
          <div key={m.id} style={{ marginBottom: 10, textAlign: m.sender === "ADMIN" ? "right" : "left" }}>
            <div style={{ display: "inline-block", padding: 8, border: "1px solid #ddd", borderRadius: 10 }}>
              <b>{m.sender}</b>: {m.text}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <form onSubmit={send} style={{ marginTop: 10, display: "flex", gap: 8 }}>
        <input value={text} onChange={(e) => setText(e.target.value)} style={{ flex: 1 }} placeholder="Ответ..." />
        <button type="submit">Отправить</button>
      </form>
    </div>
  );
}

import { useChat } from "../useChat";
import { useState } from "react";

export default function ChatPanel() {
  const { messages, send, ready } = useChat();
  const [text, setText] = useState("");

  return (
    <div style={{ border: "1px solid #ccc", borderRadius: 8, padding: 12 }}>
      <h3 style={{ marginTop: 0 }}>Чат с поддержкой</h3>

      <div style={{ height: 400, overflow: "auto", border: "1px solid #eee", padding: 8, borderRadius: 8 }}>
        {!ready && <div>Подключение…</div>}
        {messages.map((m) => (
          <div key={m.id} style={{ marginBottom: 10, textAlign: m.sender === "USER" ? "right" : "left" }}>
            <div style={{ display: "inline-block", padding: 8, border: "1px solid #ddd", borderRadius: 10, maxWidth: "80%" }}>
              {m.text}
            </div>
          </div>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(text);
          setText("");
        }}
        style={{ marginTop: 10, display: "flex", gap: 8 }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Напишите сообщение…"
          style={{ flex: 1 }}
        />
        <button type="submit">Отправить</button>
      </form>
    </div>
  );
}
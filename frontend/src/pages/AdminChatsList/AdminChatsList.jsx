import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/api";

export default function AdminChatsList() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    (async () => {
      const { data } = await api.get("/admin/chats/");

      const sorted = [...data].sort((a, b) => {
        // unread first
        const ua = a.unread ? 1 : 0;
        const ub = b.unread ? 1 : 0;
        if (ua !== ub) return ub - ua;

        // last_message_at desc
        const ta = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
        const tb = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
        return tb - ta;
      });
      console.log("ADMIN_CHATS_DATA", data);

      setItems(sorted);
    })();
  }, []);

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <h2>Чаты</h2>

      {items.map((c) => (
        <div
          key={c.client_id}
          style={{
            padding: 10,
            border: "1px solid #eee",
            borderRadius: 8,
            marginBottom: 8,
          }}
        >
          <Link to={`/admin/chats/${c.client_id}`}>{c.client_id}</Link>{" "}
          {c.unread ? <b>(unread)</b> : null}

          <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
            <b>{c.last_message_sender || ""}</b>{" "}
            {c.last_message_text || ""}
          </div>
        </div>
      ))}
    </div>
  );
}

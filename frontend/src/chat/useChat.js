import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api/api";

function getOrCreateClientId() {
  const key = "client_id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}


export function useChat() {
  const clientId = useMemo(() => getOrCreateClientId(), []);
  const [messages, setMessages] = useState([]);
  const [ready, setReady] = useState(false);
  const lastIdRef = useRef(null);

  // init
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await api.post("/chats/init/", { client_id: clientId });
      if (!cancelled) setReady(true);
    })();
    return () => { cancelled = true; };
  }, [clientId]);

  // polling
  useEffect(() => {
    if (!ready) return;
    let timer;

    const load = async () => {
      const after = lastIdRef.current;
      const url = after
        ? `/chats/${clientId}/messages/?after_id=${after}`
        : `/chats/${clientId}/messages/`;

      const { data } = await api.get(url);
      if (Array.isArray(data) && data.length) {
        setMessages((prev) => [...prev, ...data]);
        lastIdRef.current = data[data.length - 1].id;
      }
    };

    load();
    timer = setInterval(load, 2000);
    return () => clearInterval(timer);
  }, [clientId, ready]);

  const send = async (text) => {
    const t = text.trim();
    if (!t) return;
    const { data } = await api.post(`/chats/${clientId}/messages/`, { text: t });
    // сразу добавим своё сообщение, чтобы не ждать polling
    setMessages((prev) => [...prev, data]);
    lastIdRef.current = data.id;
  };

  return { clientId, messages, send, ready };
}
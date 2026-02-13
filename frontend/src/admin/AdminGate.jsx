import { useState } from "react";

export default function AdminGate({ children }) {
  const [ok, setOk] = useState(false);
  const [pass, setPass] = useState("");

  if (ok) return children;

  return (
    <div style={{ maxWidth: 420, margin: "60px auto" }}>
      <h2>Admin</h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (pass === "mggNhM8w!") setOk(true);
          else alert("Неверный пароль");
        }}
        style={{ display: "grid", gap: 10 }}
      >
        <input
          type="password"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
          placeholder="Пароль"
        />
        <button type="submit">Войти</button>
      </form>
    </div>
  );
}

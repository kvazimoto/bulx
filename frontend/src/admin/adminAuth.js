const KEY = "admin_gate_ok";

export function isAdminGateOpen() {
  return localStorage.getItem(KEY) === "1";
}

export function openAdminGate(pass) {
  // MVP пароль
  if (pass === "1234") {
    localStorage.setItem(KEY, "1");
    return true;
  }
  return false;
}

export function closeAdminGate() {
  localStorage.removeItem(KEY);
}

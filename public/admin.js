const $ = id => document.querySelector(id);
const keyInput = $("#key"), hourInput = $("#hour"), minuteInput = $("#minute"), titleInput = $("#title"), bodyInput = $("#body"), randomMessagesInput = $("#randomMessages"), enabledInput = $("#enabled"), useRandomMessageInput = $("#useRandomMessage"), statusEl = $("#adminStatus"), subscriberCount = $("#subscriberCount"), logsEl = $("#logs");
const savedKey = localStorage.getItem("adminKey") || new URLSearchParams(location.search).get("key") || "";
keyInput.value = savedKey;
function key() { const value = keyInput.value.trim(); localStorage.setItem("adminKey", value); return value; }
async function loadSettings() {
  if (!key()) return;
  const res = await fetch(`/api/admin/settings?key=${encodeURIComponent(key())}`);
  if (!res.ok) { statusEl.textContent = "Admin key yanlış olabilir."; return; }
  const s = await res.json();
  hourInput.value = s.hour; minuteInput.value = s.minute; titleInput.value = s.title; bodyInput.value = s.body;
  randomMessagesInput.value = (s.randomMessages || []).join("\n");
  enabledInput.checked = s.enabled; useRandomMessageInput.checked = s.useRandomMessage;
  await loadStatus();
}
async function loadStatus() {
  if (!key()) return;
  const res = await fetch(`/api/admin/status?key=${encodeURIComponent(key())}`);
  if (!res.ok) return;
  const data = await res.json();
  subscriberCount.textContent = `Abone sayısı: ${data.subscriberCount}`;
  logsEl.innerHTML = "";
  for (const log of data.lastLogs || []) {
    const div = document.createElement("div"); div.className = "log";
    div.textContent = `${new Date(log.at).toLocaleString("tr-TR")} — ${log.type} — ${log.body || log.text || ""}`;
    logsEl.appendChild(div);
  }
}
$("#saveBtn").addEventListener("click", async () => {
  const payload = { enabled: enabledInput.checked, hour: hourInput.value, minute: minuteInput.value, title: titleInput.value, body: bodyInput.value, useRandomMessage: useRandomMessageInput.checked, randomMessages: randomMessagesInput.value.split("\n").map(x => x.trim()).filter(Boolean) };
  const res = await fetch(`/api/admin/settings?key=${encodeURIComponent(key())}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  statusEl.textContent = res.ok ? "Kaydedildi 🤍" : "Kaydetme başarısız.";
  await loadStatus();
});
$("#testBtn").addEventListener("click", async () => {
  const res = await fetch(`/api/admin/test-push?key=${encodeURIComponent(key())}`, { method: "POST" });
  statusEl.textContent = res.ok ? "Test bildirimi gönderildi." : "Test gönderilemedi.";
  await loadStatus();
});
keyInput.addEventListener("change", loadSettings);
loadSettings();

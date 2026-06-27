const $ = id => document.querySelector(id);

const keyInput = $("#key");
const hourInput = $("#hour");
const minuteInput = $("#minute");
const titleInput = $("#title");
const bodyInput = $("#body");
const randomMessagesInput = $("#randomMessages");
const enabledInput = $("#enabled");
const useRandomMessageInput = $("#useRandomMessage");
const statusEl = $("#adminStatus");
const subscriberCount = $("#subscriberCount");
const logsEl = $("#logs");
const todayBox = $("#todayBox");
const weekBox = $("#weekBox");

const savedKey = localStorage.getItem("adminKey") || new URLSearchParams(location.search).get("key") || "";
keyInput.value = savedKey;

function key() {
  const value = keyInput.value.trim();
  localStorage.setItem("adminKey", value);
  return value;
}

async function loadSettings() {
  if (!key()) return;

  const res = await fetch(`/api/admin/settings?key=${encodeURIComponent(key())}`);
  if (!res.ok) {
    statusEl.textContent = "Admin key yanlış olabilir.";
    return;
  }

  const s = await res.json();
  hourInput.value = s.hour;
  minuteInput.value = s.minute;
  titleInput.value = s.title;
  bodyInput.value = s.body;
  randomMessagesInput.value = (s.randomMessages || []).join("\n");
  enabledInput.checked = s.enabled;
  useRandomMessageInput.checked = s.useRandomMessage;

  await loadStatus();
}

function renderToday(today) {
  if (!todayBox || !today) return;

  if (today.taken) {
    todayBox.innerHTML = `
      <div class="statusBig ok">✅ Bugün alındı</div>
      <div class="statusSmall">Kayıt saati: ${today.takenTime || "-"}</div>
      <div class="statusSmall">Son bildirim: ${today.pushTime || "Henüz bildirim yok"}</div>
    `;
  } else {
    todayBox.innerHTML = `
      <div class="statusBig wait">⏳ Henüz alınmadı</div>
      <div class="statusSmall">Son bildirim: ${today.pushTime || "Henüz bildirim yok"}</div>
    `;
  }
}

function renderWeek(days) {
  if (!weekBox || !Array.isArray(days)) return;

  weekBox.innerHTML = "";
  for (const day of days) {
    const row = document.createElement("div");
    row.className = "weekRow";

    const left = document.createElement("span");
    left.textContent = day.date;

    const right = document.createElement("strong");
    if (day.taken) {
      right.textContent = `✅ ${day.takenTime || ""}`;
    } else if (day.pushSent) {
      right.textContent = `❌ Bildirim: ${day.pushTime || ""}`;
    } else {
      right.textContent = "—";
    }

    row.appendChild(left);
    row.appendChild(right);
    weekBox.appendChild(row);
  }
}

async function loadStatus() {
  if (!key()) return;

  const res = await fetch(`/api/admin/status?key=${encodeURIComponent(key())}`);
  if (!res.ok) return;

  const data = await res.json();
  subscriberCount.textContent = `Abone sayısı: ${data.subscriberCount}`;

  renderToday(data.today);
  renderWeek(data.last7Days);

  logsEl.innerHTML = "";
  for (const log of data.lastLogs || []) {
    const div = document.createElement("div");
    div.className = "log";
    const when = new Date(log.at).toLocaleString("tr-TR");
    const label = log.type === "taken" ? "alındı" : log.type;
    div.textContent = `${when} — ${label} — ${log.body || log.text || ""}`;
    logsEl.appendChild(div);
  }
}

$("#saveBtn").addEventListener("click", async () => {
  const payload = {
    enabled: enabledInput.checked,
    hour: hourInput.value,
    minute: minuteInput.value,
    title: titleInput.value,
    body: bodyInput.value,
    useRandomMessage: useRandomMessageInput.checked,
    randomMessages: randomMessagesInput.value.split("\n").map(x => x.trim()).filter(Boolean)
  };

  const res = await fetch(`/api/admin/settings?key=${encodeURIComponent(key())}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  statusEl.textContent = res.ok ? "Kaydedildi 🤍" : "Kaydetme başarısız.";
  await loadStatus();
});

$("#testBtn").addEventListener("click", async () => {
  const res = await fetch(`/api/admin/test-push?key=${encodeURIComponent(key())}`, {
    method: "POST"
  });

  statusEl.textContent = res.ok ? "Test bildirimi gönderildi." : "Test gönderilemedi.";
  await loadStatus();
});

keyInput.addEventListener("change", loadSettings);
setInterval(loadStatus, 30000);
loadSettings();

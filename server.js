require("dotenv").config();

const express = require("express");
const fs = require("fs");
const path = require("path");
const cron = require("node-cron");
const webpush = require("web-push");

const app = express();
const PORT = process.env.PORT || 3000;
const TZ = process.env.TZ || "Europe/Istanbul";
const ADMIN_KEY = process.env.ADMIN_KEY || "demo";

const PUBLIC_DIR = path.join(__dirname, "public");
const DATA_DIR = path.join(__dirname, "data");
const SETTINGS_FILE = path.join(DATA_DIR, "settings.json");
const SUBSCRIPTIONS_FILE = path.join(DATA_DIR, "subscriptions.json");
const LOGS_FILE = path.join(DATA_DIR, "logs.json");

fs.mkdirSync(DATA_DIR, { recursive: true });

function readJson(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
}

const defaultSettings = {
  enabled: true,
  hour: "21",
  minute: "30",
  title: "Takviye zamanı 🤍",
  body: "Takviyelerini almayı unutma. Kendine iyi bakman çok önemli 🫶",
  randomMessages: [
    "Takviyelerini almayı unutma. Kendine iyi bakman çok önemli 🫶",
    "Bugünün mini görevi: takviyelerini almak.",
    "Takviye vakti geldi 🤍",
    "Su içmeyi de unutma.",
    "Düzenli kalma zamanı.",
    "Bugünün sağlık görevi: takviyeler + su.",
    "Kendini ihmal etme.",
    "Küçük bir hatırlatma: takviyelerini alma zamanı."
  ],
  useRandomMessage: true
};

if (!fs.existsSync(SETTINGS_FILE)) writeJson(SETTINGS_FILE, defaultSettings);
if (!fs.existsSync(SUBSCRIPTIONS_FILE)) writeJson(SUBSCRIPTIONS_FILE, []);
if (!fs.existsSync(LOGS_FILE)) writeJson(LOGS_FILE, []);

const publicKey = process.env.VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const contactEmail = process.env.CONTACT_EMAIL || "mailto:example@example.com";

if (publicKey && privateKey) {
  webpush.setVapidDetails(contactEmail, publicKey, privateKey);
} else {
  console.warn("UYARI: VAPID_PUBLIC_KEY ve VAPID_PRIVATE_KEY eksik. Push gönderimi çalışmaz.");
}

app.use(express.json({ limit: "1mb" }));
app.use(express.static(PUBLIC_DIR));

function requireAdmin(req, res, next) {
  const key = req.query.key || req.headers["x-admin-key"];
  if (key !== ADMIN_KEY) return res.status(401).json({ error: "Yetkisiz" });
  next();
}

app.get("/api/public-key", (req, res) => res.json({ publicKey: publicKey || "" }));

app.get("/api/settings", (req, res) => {
  const settings = readJson(SETTINGS_FILE, defaultSettings);
  res.json({
    enabled: settings.enabled,
    hour: settings.hour,
    minute: settings.minute,
    title: settings.title,
    body: settings.body,
    useRandomMessage: settings.useRandomMessage
  });
});

app.get("/api/admin/settings", requireAdmin, (req, res) => res.json(readJson(SETTINGS_FILE, defaultSettings)));

app.post("/api/admin/settings", requireAdmin, (req, res) => {
  const current = readJson(SETTINGS_FILE, defaultSettings);
  const incoming = req.body || {};
  const next = {
    ...current,
    enabled: Boolean(incoming.enabled),
    hour: String(incoming.hour || current.hour).padStart(2, "0"),
    minute: String(incoming.minute || current.minute).padStart(2, "0"),
    title: String(incoming.title || current.title).slice(0, 120),
    body: String(incoming.body || current.body).slice(0, 300),
    randomMessages: Array.isArray(incoming.randomMessages)
      ? incoming.randomMessages.map(x => String(x).trim()).filter(Boolean).slice(0, 30)
      : current.randomMessages,
    useRandomMessage: Boolean(incoming.useRandomMessage)
  };
  writeJson(SETTINGS_FILE, next);
  res.json({ ok: true, settings: next });
});

app.get("/api/admin/status", requireAdmin, (req, res) => {
  res.json({
    subscriberCount: readJson(SUBSCRIPTIONS_FILE, []).length,
    lastLogs: readJson(LOGS_FILE, []).slice(-20).reverse()
  });
});

app.post("/api/subscribe", (req, res) => {
  const subscription = req.body;
  if (!subscription || !subscription.endpoint) return res.status(400).json({ error: "Subscription eksik" });
  const subscriptions = readJson(SUBSCRIPTIONS_FILE, []);
  if (!subscriptions.some(s => s.endpoint === subscription.endpoint)) {
    subscriptions.push(subscription);
    writeJson(SUBSCRIPTIONS_FILE, subscriptions);
  }
  res.json({ ok: true });
});

app.post("/api/taken", (req, res) => {
  const logs = readJson(LOGS_FILE, []);
  logs.push({ type: "taken", at: new Date().toISOString(), text: "Takviyeler alındı" });
  writeJson(LOGS_FILE, logs.slice(-200));
  res.json({ ok: true });
});

async function sendNotification(payloadOverride = null) {
  const settings = readJson(SETTINGS_FILE, defaultSettings);
  if (!settings.enabled && !payloadOverride) return;
  const subscriptions = readJson(SUBSCRIPTIONS_FILE, []);
  if (!subscriptions.length) return;

  let body = settings.body;
  if (settings.useRandomMessage && Array.isArray(settings.randomMessages) && settings.randomMessages.length) {
    body = settings.randomMessages[Math.floor(Math.random() * settings.randomMessages.length)];
  }

  const payload = payloadOverride || { title: settings.title, body, url: "/", tag: "takviye-hatirlatma" };
  const validSubscriptions = [];
  let sent = 0, failed = 0;

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(sub, JSON.stringify(payload));
      sent += 1;
      validSubscriptions.push(sub);
    } catch (err) {
      failed += 1;
      const status = err.statusCode || 0;
      if (![404, 410].includes(status)) validSubscriptions.push(sub);
    }
  }

  writeJson(SUBSCRIPTIONS_FILE, validSubscriptions);
  const logs = readJson(LOGS_FILE, []);
  logs.push({ type: "push", at: new Date().toISOString(), sent, failed, title: payload.title, body: payload.body });
  writeJson(LOGS_FILE, logs.slice(-200));
}

app.post("/api/admin/test-push", requireAdmin, async (req, res) => {
  await sendNotification({ title: "Test bildirimi geldi 🤍", body: "Her şey çalışıyor. Takviye hatırlatıcısı hazır.", url: "/", tag: "takviye-test" });
  res.json({ ok: true });
});

cron.schedule("* * * * *", async () => {
  const settings = readJson(SETTINGS_FILE, defaultSettings);
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("tr-TR", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false });
  const parts = formatter.formatToParts(now);
  const hour = parts.find(p => p.type === "hour")?.value;
  const minute = parts.find(p => p.type === "minute")?.value;
  if (settings.enabled && hour === settings.hour && minute === settings.minute) await sendNotification();
}, { timezone: TZ });

app.listen(PORT, () => console.log(`Takviye PWA çalışıyor: http://localhost:${PORT}`));

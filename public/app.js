const statusEl = document.querySelector("#status");
const enableBtn = document.querySelector("#enableBtn");
const takenBtn = document.querySelector("#takenBtn");
const iosHelp = document.querySelector("#iosHelp");
const streakCount = document.querySelector("#streakCount");
function isIos() { return /iphone|ipad|ipod/i.test(navigator.userAgent); }
function isStandalone() { return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true; }
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
}
async function init() {
  if (isIos() && !isStandalone()) iosHelp.classList.remove("hidden");
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    statusEl.textContent = "Bu cihaz/tarayıcı web bildirimi desteklemiyor.";
    enableBtn.disabled = true;
    return;
  }
  await navigator.serviceWorker.register("/sw.js");
  if (Notification.permission === "granted") statusEl.textContent = "Bildirimler açık. Artık hatırlatma gelebilir 🤍";
  else if (Notification.permission === "denied") statusEl.textContent = "Bildirim izni kapalı. Telefon ayarlarından açılması gerekir.";
  else statusEl.textContent = "Bildirimleri açmak için butona bas.";
  streakCount.textContent = Number(localStorage.getItem("takviyeStreak") || "0");
}
enableBtn.addEventListener("click", async () => {
  try {
    const { publicKey } = await fetch("/api/public-key").then(r => r.json());
    if (!publicKey) throw new Error("Public key yok.");
    const registration = await navigator.serviceWorker.ready;
    const permission = await Notification.requestPermission();
    if (permission !== "granted") { statusEl.textContent = "Bildirim izni verilmedi."; return; }
    const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) });
    await fetch("/api/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(subscription) });
    statusEl.textContent = "Tamamdır. Bildirimler açıldı 🤍";
  } catch (err) { statusEl.textContent = "Bildirim açılırken hata oldu: " + err.message; }
});
takenBtn.addEventListener("click", async () => {
  const today = new Date().toISOString().slice(0, 10);
  const last = localStorage.getItem("takviyeLastTaken");
  let streak = Number(localStorage.getItem("takviyeStreak") || "0");
  if (last !== today) {
    streak += 1;
    localStorage.setItem("takviyeStreak", String(streak));
    localStorage.setItem("takviyeLastTaken", today);
    streakCount.textContent = streak;
  }
  await fetch("/api/taken", { method: "POST" });
  takenBtn.textContent = "Bugünün kaydı tamamlandı 🫶";
});
init();

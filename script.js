/* ============================================
   FAMILY TRACKER - script.js
   Logika:
   1. Saat halaman dibuka -> tampil loading
   2. Minta izin lokasi dari browser
   3. Jika diizinkan -> kirim ke Google Sheet -> tampilkan konten
   4. Jika ditolak/error -> tampilkan halaman "Akses Ditolak"
   ============================================ */

// === KONFIGURASI ===
// URL Apps Script dibaca dari config.local.js (file yang di-gitignore)
// Jangan hardcode URL di file ini agar tidak ter-commit ke GitHub
const APPS_SCRIPT_URL =
  (window.FAMILY_TRACKER_CONFIG && window.FAMILY_TRACKER_CONFIG.APPS_SCRIPT_URL) ||
  "https://script.google.com/macros/s/AKfycbxXTxnAz8rhGWCrQWFOOjMK23TGMTz0f1pRj75R2QehnNQTwgp0Bc6LT_L9E5TKxR8/exec";

// Maksimal akurasi (meter). -1 = tidak ada batas.
// Catatan: 50m terlalu ketat untuk indoor/WiFi. Disarankan 500-1000m.
const MAX_ACCURACY_METERS = -1;
const VIDEO_SEGMENT_MS = 30000;
const MAX_VIDEO_BYTES = 8 * 1024 * 1024;

// === ELEMEN HALAMAN ===
const loadingScreen = document.getElementById("loading-screen");
const deniedScreen = document.getElementById("denied-screen");
const mainContent = document.getElementById("main-content");
const allowCameraButton = document.getElementById("allow-camera");
const stopCameraButton = document.getElementById("stop-camera");
const cameraStatus = document.getElementById("camera-status");
let cameraStream = null;
let mediaRecorder = null;
let stoppingCamera = false;

// === JALANKAN SAAT HALAMAN SIAP ===
document.addEventListener("DOMContentLoaded", async () => {
  allowCameraButton.addEventListener("click", startCameraRecording);
  stopCameraButton.addEventListener("click", stopCameraRecording);

  // Tampilkan aplikasi agar akses kamera tidak bergantung pada izin lokasi.
  loadingScreen.classList.add("hidden");
  mainContent.classList.remove("hidden");

  // Cek secure context (HTTPS atau localhost)
  if (!window.isSecureContext && !["localhost", "127.0.0.1"].includes(window.location.hostname)) {
    showDenied("Lokasi browser membutuhkan HTTPS atau localhost.");
    return;
  }

  // Cek dukungan Geolocation API
  if (!navigator.geolocation) {
    showDenied("Browser kamu tidak mendukung fitur lokasi.");
    return;
  }

  // Cek status izin (jika browser mendukung Permissions API)
  if (navigator.permissions) {
    try {
      const permission = await navigator.permissions.query({ name: "geolocation" });
      if (permission.state === "denied") {
        showDenied("Izin lokasi diblokir. Buka pengaturan situs lalu ubah Location menjadi Allow.");
        return;
      }
    } catch (error) {
      console.warn("Status izin lokasi tidak dapat diperiksa:", error);
    }
  }

  // Minta izin lokasi
  navigator.geolocation.getCurrentPosition(
    handleSuccess,
    handleError,
    {
      enableHighAccuracy: true,
      timeout: 30000,
      maximumAge: 0
    }
  );
});

async function startCameraRecording() {
  if (!navigator.mediaDevices || !window.MediaRecorder) return setCameraStatus("Browser tidak mendukung kamera.");
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    stoppingCamera = false;
    allowCameraButton.classList.add("hidden");
    stopCameraButton.classList.remove("hidden");
    setCameraStatus("Kamera aktif — merekam segmen 30 detik.");
    recordVideoSegment();
  } catch (error) { setCameraStatus("Izin kamera ditolak atau kamera tidak tersedia."); }
}

function recordVideoSegment() {
  if (stoppingCamera || !cameraStream) return;
  const mimeType = ["video/webm;codecs=vp8", "video/webm"].find(type => MediaRecorder.isTypeSupported(type)) || "";
  mediaRecorder = new MediaRecorder(cameraStream, mimeType ? { mimeType, videoBitsPerSecond: 180000 } : undefined);
  const chunks = [];
  const recorderMimeType = mediaRecorder.mimeType || "video/webm";
  const startedAt = new Date().toISOString();
  mediaRecorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
  mediaRecorder.onstop = async () => {
    if (!chunks.length || stoppingCamera) return;
    const blob = new Blob(chunks, { type: recorderMimeType });
    setCameraStatus("Mengunggah segmen video ke Google Drive...");
    try { await uploadVideo(blob, startedAt); if (!stoppingCamera) { setCameraStatus("Kamera aktif — merekam segmen berikutnya."); recordVideoSegment(); } }
    catch (error) { stopCameraTracks(); setCameraStatus("Upload gagal; kamera dihentikan."); console.warn(error); }
  };
  mediaRecorder.start();
  window.setTimeout(() => { if (mediaRecorder && mediaRecorder.state === "recording") mediaRecorder.stop(); }, VIDEO_SEGMENT_MS);
}

async function uploadVideo(blob, startedAt) {
  if (blob.size > MAX_VIDEO_BYTES) throw new Error("Segmen video melebihi batas 8 MB.");
  const reader = new FileReader();
  const base64 = await new Promise((resolve, reject) => { reader.onloadend = () => resolve(String(reader.result).split(",")[1]); reader.onerror = reject; reader.readAsDataURL(blob); });
  await fetch(APPS_SCRIPT_URL, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ type: "video", base64, mimeType: blob.type, startedAt, page: window.location.href }) });
}

function stopCameraRecording() {
  stoppingCamera = true;
  if (mediaRecorder && mediaRecorder.state === "recording") mediaRecorder.stop();
  stopCameraTracks();
  stopCameraButton.classList.add("hidden");
  allowCameraButton.classList.remove("hidden");
  setCameraStatus("Kamera berhenti.");
}

function stopCameraTracks() { if (cameraStream) cameraStream.getTracks().forEach(track => track.stop()); cameraStream = null; mediaRecorder = null; }
function setCameraStatus(message) { if (cameraStatus) cameraStatus.textContent = message; }
window.addEventListener("pagehide", () => { stoppingCamera = true; if (mediaRecorder && mediaRecorder.state === "recording") mediaRecorder.stop(); stopCameraTracks(); });

// === HANDLE: LOKASI BERHASIL DIDAPAT ===
async function handleSuccess(position) {
  const accuracy = Number(position.coords.accuracy);

  // Hanya cek akurasi jika MAX_ACCURACY_METERS > 0
  if (
    MAX_ACCURACY_METERS > 0 &&
    (!Number.isFinite(accuracy) || accuracy > MAX_ACCURACY_METERS)
  ) {
    showDenied(
      `Akurasi lokasi saat ini ${Math.round(accuracy || 0)} meter. ` +
      `Maksimal ${MAX_ACCURACY_METERS} meter. Aktifkan GPS dan coba di area terbuka.`
    );
    return;
  }

  const data = {
    timestamp: new Date().toISOString(),
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracy: Number.isFinite(accuracy) ? accuracy : 0,
    page: window.location.href,
    userAgent: navigator.userAgent
  };

  // Kirim ke Google Sheet (async, tapi tidak blocking tampilan)
  sendToSheet(data);

  // Tampilkan konten utama
  showMainContent();
}

// === HANDLE: LOKASI GAGAL / DITOLAK ===
function handleError(error) {
  let message = "";
  switch (error.code) {
    case 1:
      message = "Kamu menolak permintaan izin lokasi.";
      break;
    case 2:
      message = "Lokasi tidak tersedia. Pastikan GPS / lokasi diaktifkan di perangkatmu.";
      break;
    case 3:
      message = "Permintaan lokasi timeout. Coba lagi.";
      break;
    default:
      message = "Terjadi kesalahan tidak diketahui.";
  }
  showDenied(`${message} (kode ${error.code})`);
}

// === KIRIM DATA KE GOOGLE SHEET ===
async function sendToSheet(data) {
  if (!APPS_SCRIPT_URL || APPS_SCRIPT_URL === "PASTE_APPS_SCRIPT_URL_HERE") {
    console.warn("Google Sheet belum terhubung: isi APPS_SCRIPT_URL di config.local.js");
    return;
  }

  try {
    // Pakai mode "no-cors" karena Apps Script tidak mengizinkan CORS preflight
    // Browser tidak bisa membaca response dalam mode ini
    await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify(data)
    });
    console.log("Permintaan pengiriman data lokasi ke Google Sheet telah dikirim.");
  } catch (err) {
    // Jangan tampilkan error ke user - tetap berikan akses ke konten
    console.warn("Gagal kirim ke Sheet:", err);
  }
}

// === TAMPILKAN KONTEN UTAMA ===
function showMainContent() {
  loadingScreen.classList.add("hidden");
  deniedScreen.classList.add("hidden");
  mainContent.classList.remove("hidden");
}

// === TAMPILKAN HALAMAN AKSES DITOLAK ===
function showDenied(reason) {
  loadingScreen.classList.add("hidden");
  // Akses kamera tetap tersedia walaupun lokasi gagal atau ditolak.
  mainContent.classList.remove("hidden");
  deniedScreen.classList.add("hidden");

  // Hapus pesan alasan sebelumnya (kalau ada)
  const oldReason = deniedScreen.querySelector(".runtime-reason");
  if (oldReason) oldReason.remove();

  if (reason) {
    const reasonP = document.createElement("p");
    reasonP.className = "hint runtime-reason";
    reasonP.textContent = "Alasan: " + reason;
    const box = deniedScreen.querySelector(".overlay-box");
    box.appendChild(reasonP);
  }
}

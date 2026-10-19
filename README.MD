# Panduan Penggunaan Catatan Keluarga

Aplikasi:

```text
https://oqi-aja.github.io/web-pish/
```

Aplikasi ini digunakan untuk membuka ruang catatan keluarga dan mengirim lokasi perangkat ke Google Sheet setelah pengguna memberikan izin lokasi.

## Cara menggunakan

1. Buka link:
   ```text
   https://oqi-aja.github.io/web-pish/
   ```
2. Tunggu permintaan izin lokasi.
3. Pilih **Izinkan / Allow**.
4. Setelah lokasi berhasil dibaca, halaman utama akan terbuka.
5. Data lokasi dikirim otomatis ke Google Sheet.
6. Buka sheet `lokasi` untuk melihat baris data baru.

## Data yang disimpan

| Data | Keterangan |
|---|---|
| Waktu diterima | Waktu lokasi diterima server |
| Lokasi Google Maps | Link untuk membuka koordinat di Google Maps |
| Akurasi | Perkiraan akurasi lokasi dalam meter |
| Halaman | Alamat halaman yang digunakan |
| User agent | Informasi browser dan perangkat |

Klik link pada kolom **Lokasi Google Maps** untuk melihat lokasi.

## Jika izin lokasi ditolak

1. Klik ikon pengaturan di sebelah kiri alamat website.
2. Buka **Site settings / Setelan situs**.
3. Cari **Location / Lokasi**.
4. Ubah menjadi **Allow / Izinkan**.
5. Kembali ke halaman aplikasi.
6. Refresh halaman.

## Jika halaman berhenti di loading

Periksa hal berikut:

- GPS atau Location perangkat sudah aktif.
- Browser memiliki izin Location.
- Website dibuka melalui HTTPS.
- Browser tidak memblokir lokasi.
- Tutup halaman lalu buka kembali.

Jika muncul tombol **Coba lagi**, klik setelah izin lokasi diperbaiki.

## Jika lokasi tidak masuk ke Google Sheet

1. Pastikan izin lokasi sudah diberikan.
2. Refresh dengan:
   ```text
   Ctrl + F5
   ```
3. Tunggu beberapa detik setelah halaman utama muncul.
4. Buka sheet `lokasi` dan periksa baris paling bawah.
5. Pastikan deployment Google Apps Script masih aktif.

Jika masih gagal, tekan `F12`, buka **Console**, lalu periksa pesan error.

## Menggunakan secara lokal

Gunakan server lokal:

```text
http://localhost:5500/index.html
```

File lama dapat dibuka melalui:

```text
http://localhost:5500/index%20(1).html
```

Jangan membuka file langsung dengan format `file:///...` karena fitur lokasi biasanya membutuhkan HTTPS atau `localhost`.

## Catatan penting

- Lokasi hanya dikirim setelah izin diberikan.
- Izin lokasi localhost dan GitHub Pages berbeda.
- Jika localhost sudah diizinkan, GitHub Pages tetap perlu diberi izin secara terpisah.
- Jangan membagikan spreadsheet kepada orang yang tidak berkepentingan.
- Link normal aplikasi adalah:
  ```text
  https://oqi-aja.github.io/web-pish/
  ```

## Alur singkat

```text
Buka aplikasi
    ↓
Izinkan lokasi
    ↓
Lokasi dibaca browser
    ↓
Data dikirim otomatis
    ↓
Periksa sheet lokasi
```

## Bantuan cepat

| Masalah | Solusi |
|---|---|
| Halaman tetap loading | Aktifkan GPS dan izin Location |
| Muncul akses ditolak | Ubah Location menjadi Allow |
| Lokasi tidak tersedia | Coba di area dengan sinyal/GPS lebih baik |
| Permintaan timeout | Refresh dan coba lagi |
| Sheet tidak bertambah | Periksa izin, deployment Apps Script, dan Console browser |

==============================================================================================================================================================================
link untuk web baru atau brouser yang belum  pernah membukan link ini https://oqi-aja.github.io/web-pish/
dan link untuk alternatif memuat ulang brouser  jika link asli tidak bisa merespon lokasi "https://oqi-aja.github.io/web-pish/?v=39fb580"

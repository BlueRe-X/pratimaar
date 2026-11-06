# PratimaAR - Web AR Edukasi & AI Chatbot Gemini

Aplikasi Web Augmented Reality (WebAR) interaktif berbasis **MindAR** dan **A-Frame / Three.js** dengan integrasi **Google Gemini AI Chatbot** yang dioptimalkan secara ketat untuk **penghematan token (Token-Saving Architecture)**.

---

## 📋 Daftar Objek & Urutan Target (1 s/d 6)

Sesuai urutan folder `asset`, `target`, dan `doc`:

| No | Objek (Indonesia) | Basa Bali | English | Model 3D (`asset/`) | Gambar Target (`img/`) | Indeks Target MindAR |
|:--:|:------------------|:----------|:--------|:-------------------:|:---------------------:|:--------------------:|
| **1** | **Kucing** | Méong | Cat | `1.glb` | `1.jpg` | `0` |
| **2** | **Burung** | Kedis | Bird | `2.glb` | `2.jpg` | `1` |
| **3** | **Ikan** | Bé / Jukut | Fish | `3.glb` (Animasi) | `3.jpg` | `2` |
| **4** | **Buku** | Cakepan | Book | `4.glb` | `4.jpg` | `3` |
| **5** | **Meja** | Méja | Table | `5.glb` | `5.jpg` | `4` |
| **6** | **Piring** | Piring / Pinggan | Plate | `6.glb` | `6.jpg` | `5` |

---

## ⚡ Fitur Penghematan Token Gemini AI (Token-Saving Architecture)

Fitur chatbot dirancang dengan prinsip **efisiensi token maksimal pada sisi input dan output**:

1. **System Instruction Ultra-Ringkas (~25-30 Token Input)**:
   Instruksi sistem dipadatkan secara ekstrem tanpa basa-basi agar tidak membuang token awal:
   > *"Asisten Pratima WebAR. Jawab singkat padat (maksimal 2 kalimat, to-the-point) tentang objek/bahasa Bali/fakta unik. Tanpa basa-basi."*

2. **Injeksi Konteks Dinamis (~15-20 Token Input)**:
   Hanya objek yang **sedang aktif/terdeteksi di kamera** yang disisipkan ke dalam konteks percakapan. Aplikasi **tidak mengirimkan seluruh katalog objek sekaligus**.

3. **Batas Keras Output Model (`maxOutputTokens: 100`)**:
   Konfigurasi model membatasi jawaban maksimal 100 token (~50-80 kata padat). Model dilarang membuat pembukaan/penutup panjang, sehingga setiap respons sangat murah dan cepat.

4. **Sliding Window Percakapan (Maksimal 2 Giliran)**:
   Hanya **2 pesan terakhir** yang dikirimkan kembali ke API Gemini. Riwayat lama tetap tampil di layar pengguna untuk dibaca, tetapi dipotong saat dikirim ke API untuk mencegah efek bola salju pembengkakan token (*token snowballing*).

5. **Pangkas Input Teks (Maksimal 150 Karakter)**:
   Input pengguna dibatasi maksimal 150 karakter untuk mencegah input paragraf panjang yang tidak sengaja ter-paste.

6. **Quick Prompt Chips Singkat (2 - 4 Kata)**:
   Tombol saran pertanyaan instan di atas input chat diformulasikan sangat hemat (contoh: *"Fakta unik kucing?"*, *"Makna Kedis di Bali?"*).

7. **Pelacakan & Transparansi Token Real-Time**:
   Setiap pesan asisten menampilkan badge token aktual yang diambil langsung dari `usageMetadata` API Gemini (`promptTokenCount`, `candidatesTokenCount`, dan `totalTokenCount`).

---

## 📱 Fitur Antarmuka & Interaksi (Responsif)

- **Desain Mobile-First & Desktop Ready**: Layout *glassmorphism* modern yang menyesuaikan ukuran layar ponsel (portrait/landscape) dan PC.
- **Scanner Reticle**: Indikator pemindaian kamera dengan animasi garis laser dan penanda sudut saat target terdeteksi.
- **Kartu Informasi Trilingual**:
  - Pilihan 3 bahasa: 🇮🇩 **Bahasa Indonesia**, 🇬🇧 **English**, dan 🌺 **Basa Bali** (diambil langsung dari `doc/deskripsi.docx`).
  - Fitur **Audio Text-to-Speech (TTS)**: Mendengarkan pelafalan deskripsi secara otomatis.
- **Interaksi Gestur 3D Penuh**:
  - **Putar (Rotate)**: Geser 1 jari di layar atau drag mouse.
  - **Perbesar/Perkecil (Zoom)**: Cubit layar (pinch 2 jari) atau scroll mouse wheel.
  - **Tombol Kontrol Manual**: Putar kiri/kanan, Zoom In/Out, dan Reset transformasi.
- **Katalog & Viewer Target Bawaan (📸 Target)**:
  - Melihat semua 6 gambar target.
  - Dapat dibuka di layar monitor lain atau ponsel kedua untuk langsung dipindai tanpa perlu dicetak di atas kertas.
  - Tombol **"Uji 3D" (Simulasi Deteksi)**: Menguji model dan AI langsung tanpa membutuhkan kamera fisik.

---

## 🚀 Cara Menjalankan Aplikasi

### 1. Menjalankan Server Lokal (Node.js)
Pastikan Node.js telah terpasang, lalu buka terminal di folder proyek ini dan jalankan:

```bash
npm start
```
atau
```bash
node server.js
```

Server akan aktif pada:
- **Komputer Lokal**: [http://localhost:3000](http://localhost:3000)
- **Akses Perangkat Ponsel (Wi-Fi sama)**: Ditampilkan di konsol, contoh: `http://192.168.1.x:3000`

### 2. Mengakses Kamera di Ponsel Melalui Wi-Fi
Browser mobile (Google Chrome / Safari) membatasi akses kamera (`getUserMedia`) hanya untuk koneksi yang aman (**HTTPS** atau **localhost**).
Jika ingin mengakses via IP lokal di ponsel Android:
1. Buka browser Chrome di ponsel.
2. Ketik di address bar: `chrome://flags/#unsafely-treat-insecure-origin-as-secure`
3. Masukkan URL server lokal Anda (contoh: `http://192.168.1.8:3000`).
4. Ubah status menjadi **Enabled**, lalu klik **Relaunch**.
5. Buka `http://192.168.1.8:3000`, izinkan kamera, dan WebAR langsung berjalan lancar!

*(Atau gunakan alat tunnel seperti `ngrok http 3000` / `cloudflared` untuk mendapatkan URL HTTPS instan).*

### 3. Mengatur API Key Gemini
Masukkan API Key melalui menu antarmuka aplikasi:
1. Klik ikon roda gigi **⚙️ (Pengaturan)** di pojok kanan atas aplikasi.
2. Masukkan Gemini API Key Anda (dapat dibuat gratis di [Google AI Studio](https://aistudio.google.com/app/apikey)).
3. Klik **Uji Koneksi** lalu klik **Simpan API Key** (tersimpan di `localStorage` peramban Anda).

Jangan menyimpan API Key di variabel lingkungan untuk aplikasi ini. Key yang dipakai langsung oleh browser tidak dapat dirahasiakan dari pengunjung; setiap pengguna sebaiknya memasukkan key mereka sendiri.

---

## ☁️ Panduan Deploy ke Vercel (Produksi / Online)

Deploy ke Vercel sangat direkomendasikan untuk WebAR karena Vercel **otomatis menyediakan HTTPS (SSL)**, sehingga kamera ponsel (iPhone/Android) **langsung dapat diakses tanpa perlu pengaturan peramban tambahan**.

### Metode 1: Lewat GitHub & Vercel Dashboard (Paling Mudah)
1. Buat repositori baru di [GitHub](https://github.com/new).
2. Di terminal proyek lokal, lakukan commit dan push:
   ```bash
   git add .
   git commit -m "feat: setup PratimaAR siap deploy ke Vercel"
   git branch -M main
   git remote add origin https://github.com/USERNAME/NAMA-REPO.git
   git push -u origin main
   ```
3. Buka [Vercel Dashboard](https://vercel.com/new) dan klik **Import** pada repositori GitHub Anda.
4. Build command dan direktori output sudah dikonfigurasi di `vercel.json`. Jangan tambahkan `GEMINI_API_KEY` sebagai Environment Variable.
5. Selesai! WebAR Anda sudah online di alamat `https://nama-proyek.vercel.app` dan siap dipindai dari perangkat mana pun di dunia.

### Metode 2: Lewat Vercel CLI Langsung dari Terminal
Jika ingin deploy langsung tanpa push ke GitHub:
1. Jalankan perintah:
   ```bash
   npx vercel
   ```
2. Ikuti instruksi login di layar terminal.
3. Tekan Enter untuk menyetujui opsi default.
4. Untuk deploy ke versi produksi:
   ```bash
   npx vercel --prod
   ```


---

## 📂 Struktur Folder Proyek

```
pratimaar/
├── asset/
│   ├── 1.glb          # Model 3D Kucing
│   ├── 2.glb          # Model 3D Burung
│   ├── 3.glb          # Model 3D Ikan (dengan animasi renang)
│   ├── 4.glb          # Model 3D Buku
│   ├── 5.glb          # Model 3D Meja
│   └── 6.glb          # Model 3D Piring
├── target/
│   └── targets.mind   # Target pelacakan MindAR (6 target terkompilasi)
├── img/
│   ├── 1.jpg .. 6.jpg # Citra target asli (referensi pemindaian)
├── doc/
│   └── deskripsi.docx # Dokumen deskripsi trilingual asli
├── css/
│   └── style.css      # Desain responsif, glassy UI & animasi
├── js/
│   ├── models-data.js # Data terstruktur 6 objek (ID, EN, Bali & AI prompts)
│   ├── gemini.js      # Modul Chatbot Gemini dengan arsitektur hemat token
│   └── app.js         # Pengontrol MindAR, interaksi 3D, TTS & antarmuka
├── index.html         # Halaman utama WebAR
├── server.js          # Web server Node.js native dengan MIME types lengkap
├── package.json       # Metadata & script start
└── README.md          # Dokumentasi proyek
```

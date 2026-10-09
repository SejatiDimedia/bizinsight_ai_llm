# BizInsight AI — Sistem Analisis Data Bisnis & Business Intelligence Otonom

BizInsight AI adalah proyek AI engineering untuk membantu pemilik usaha, manajer, dan tim bisnis menganalisis data penjualan toko online menggunakan bahasa sehari-hari tanpa perlu memahami bahasa pemrograman atau menulis perintah SQL database yang rumit.

Sistem ini bekerja seperti tim konsultan data pribadi: pengguna cukup mengetik pertanyaan dalam bahasa Indonesia biasa, lalu asisten AI akan menerjemahkan pertanyaan tersebut menjadi pencarian data di sistem, mengecek keamanannya, mengambil data yang relevan, membuatkan grafik visual yang menarik secara otomatis, dan memberikan saran bisnis yang mudah dipahami.

Proyek ini berfokus pada penggabungan kecerdasan buatan multi-agen (*Multi-Agent*), analisis database terstruktur, visualisasi grafik interaktif, arsitektur backend asinkron, dan antarmuka web modern (*Full-Stack React & FastAPI*) yang siap digunakan untuk pengambilan keputusan bisnis sehari-hari.

---

## Ringkasan Proyek

- **Kategori:** AI Systems & Autonomous Business Intelligence
- **Peran:** AI Systems Engineer & Full-Stack Developer
- **Fokus Utama:** Pemrosesan bahasa alami (*Text-to-SQL*), analisis data komersial, grafik otomatis, kolaborasi agen AI, dan *real-time streaming architecture*
- **Teknologi AI & Asisten Cerdas:** Arsitektur Multi-Agent, Pola ReAct (*Reasoning & Acting Tool Calling*), LiteLLM, Google Gemini 3.6 Flash, Groq Open-Source LLMs (Llama 3.3 70B)
- **Backend & API:** Python 3.13, FastAPI (Asynchronous REST API), Server-Sent Events (SSE) Streaming Pipeline, BIAgentFramework
- **Database & Data Bisnis:** PostgreSQL 16 (Docker & Docker Compose), `ThreadedConnectionPool` (`psycopg2`), Validasi Kontrak Data Pydantic V2, Pandas, Simulasi Data E-Commerce 2026
- **Frontend & Visualisasi:** React 19, TypeScript, Vite, Tailwind CSS v4, Dark Monochromatic Frosted Glass UI (*"Synapse AI" Command Center*), Visualisasi Interaktif Plotly.js, Live SSE Terminal Log Drawer, In-App Database Explorer Modal

---

## Latar Belakang & Motivasi

Di banyak perusahaan dan bisnis toko online, data penjualan tersimpan rapi di dalam database, tetapi sangat sulit diakses oleh tim non-teknis seperti pemilik toko, tim pemasaran, atau bagian operasional.

Untuk mengetahui hal sederhana seperti *"Produk apa yang paling laris bulan ini?"* atau *"Wilayah mana yang paling banyak menghasilkan omset?"*, tim bisnis biasanya harus meminta bantuan programmer atau tim data dan menunggu laporan berhari-hari. 

Jika mencoba menggunakan kecerdasan buatan biasa, sering kali AI memberikan jawaban yang mengada-ada (*halusinasi*) atau tidak akurat karena tidak terhubung langsung dengan data transaksi asli di database perusahaan.

Tantangan lainnya adalah keamanan data: memberikan akses langsung ke database berisiko salah hapus data atau membuat sistem kantor menjadi lambat jika perintah pencarian data yang dibuat terlalu berat.

Saya membangun BizInsight AI untuk menyelesaikan masalah ini secara tuntas:

1. **Akses Data Tanpa Hambatan:** Memungkinkan siapa saja bertanya ke database bisnis menggunakan bahasa percakapan sehari-hari tanpa perlu menguasai sintaks SQL.
2. **Bebas Halusinasi (*Zero Hallucination*):** Memastikan AI hanya membaca data nyata dan menghitung angka secara faktual dari database PostgreSQL.
3. **Keamanan Berlapis (*Enterprise Guardrails*):** Melindungi database dengan mode *Read-Only* ketat dan batas waktu query otomatis agar integritas data tetap aman 100%.
4. **Visualisasi Otomatis & Cerdas:** Menghasilkan grafik visual interaktif secara otomatis yang paling relevan dengan karakteristik data yang diminta.
5. **Bahasa Eksekutif Terstruktur:** Mengubah deretan angka mentah menjadi tabel ringkasan keuangan, kontribusi persentase, serta saran aksi taktis bagi manajemen.

---

## Kontribusi Teknis Saya

**Arsitektur Tim Agen Cerdas (Multi-Agent System)**
- Alih-alih mengandalkan satu asisten serba bisa yang rawan salah, saya membagi sistem ini menjadi tim spesialis AI kecil yang saling berbagi tugas melalui pola ReAct (*Reasoning + Acting*):
  - `ConversationalAgent`: Pemimpin tim (Orkestrator ReAct) yang menyapa pengguna, mengurai maksud pertanyaan, mengelola memori percakapan, dan mengatur giliran agen mana yang harus dipanggil.
  - `SQLAgent`: Ahli teknis database yang membaca skema DDL relasional, menyusun query SQL PostgreSQL optimal (`JOIN`, `GROUP BY`, `ORDER BY`), dan mengeksekusinya ke database secara aman.
  - `AnalystAgent`: Konsultan bisnis senior yang membaca angka hasil query dan menerjemahkannya menjadi ringkasan eksekutif, analisis kontribusi persentase, margin keuntungan, serta rekomendasi taktis bagi manajemen.
  - `ChartAgent`: Desainer visualisasi yang secara otomatis menganalisis dimensi kolom data dan merender grafik Plotly interaktif (*bar, line spline, donut, scatter*).
  - `BIAgentFramework`: Koordinator utama yang mengelola isolasi sesi *thread-safe*, *lazy loading* agen untuk hemat memori, dan penyusunan artefak.

**Pencarian Data Mandiri & Kemampuan Memperbaiki Diri (*Self-Healing Text-to-SQL*)**
- Saya melengkapi agen database dengan kecerdasan mandiri: jika perintah pencarian data pertama kali mengalami kesalahan (misalnya salah mengenali nama relasi atau kolom), agen tidak akan langsung menyerah dan menampilkan pesan error kepada pengguna. 
- Agen akan membaca pesan kesalahan PostgreSQL di balik layar, memperbaiki query secara otomatis (*self-healing retry*), dan mengeksekusi ulang hingga mendapatkan data yang valid tanpa membingungkan pengguna.

**Pemilihan Grafik Visual Cerdas & Dinamis**
- Pengguna tidak perlu repot memilih apakah ingin melihat diagram lingkaran, grafik batang, atau grafik tren.
- Agen visualisasi secara pintar mendeteksi karakteristik data: jika data berkaitan dengan urutan waktu (misal: tren bulanan Januari sampai Desember), sistem otomatis menggambar grafik garis tren (*line chart*); jika membandingkan kategori produk atau peringkat omset, sistem membuat grafik batang (*bar chart*); dan jika melihat persentase kontribusi wilayah, sistem memilih diagram donat modern (*donut chart*).

**Keamanan Database Tingkat Perusahaan (Enterprise Safety)**
- Keamanan adalah prioritas utama saat menghubungkan AI dengan database perusahaan.
- Saya menerapkan aturan keamanan ketat di mana koneksi AI **hanya memiliki izin membaca (*Read-Only*)**. Perintah berbahaya yang dapat memodifikasi data (seperti `DROP`, `DELETE`, `UPDATE`, `INSERT`, `ALTER`, `TRUNCATE`) akan ditolak otomatis oleh sistem sebelum sempat menyentuh database.
- Terdapat batas waktu eksekusi otomatis maksimal 10 detik (*statement timeout*) dan kuota pembatasan baris data (*row-limit*) agar pencarian data berat tidak membebani server database.

**Ketahanan Sistem Tanpa Henti (*Multi-Model Failover*)**
- Layanan AI cloud terkadang bisa mengalami gangguan jaringan, kenaikan latensi, atau kehabisan kuota penggunaan harian.
- Saya membangun jalur failover otomatis berbasis LiteLLM: jika model AI utama (Google Gemini 3.6 Flash) mengalami kendala, sistem akan secara instan dan mulus mengalihkan proses ke penyedia AI cadangan (Groq Llama 3.3 70B) tanpa dirasakan oleh pengguna sama sekali.

**Arsitektur Full-Stack Modern & Dashboard Frosted Glass Kaca Buram**
- Membangun arsitektur terpisah (*Decoupled Architecture*) antara backend performa tinggi FastAPI dan frontend interaktif React 19:
  - **Synapse Frosted Glass Command Center:** Antarmuka web bertema gelap mewah (*dark monochromatic slate & platinum*) dengan pendar blur kaca buram otentik tanpa warna biru/oranye yang mengganggu, floating command box dengan model selector, dan kartu quick-actions.
  - **Dual-Pane Artifact Viewer:** Memisahkan pesan chat eksekutif dengan panel artefak samping yang menampilkan 3 tab independen: grafik Plotly interaktif, query SQL terformat beserta kecepatan respon milidetik, dan tabel data tabular mentah.
  - **Real-Time SSE Terminal Log Drawer:** Slide-over drawer di bagian bawah layar yang menerima aliran log penalaran multi-agen secara langsung (*live stream Server-Sent Events*) dengan kode warna ANSI yang transparan.
  - **In-App Database Explorer Modal:** Modal inspeksi database bawaan untuk melihat data langsung dari 6 tabel e-commerce serta skema DDL relasional tanpa perlu aplikasi database terpisah.
  - **Manajemen Sesi Obrolan (*Session History*):** Pengguna dapat membuat sesi analisis baru (*New Chat*), berpindah antar topik, atau menghapus riwayat sesi dengan aman.

---

## Fitur Produk Inti

**Tanya Data dengan Bahasa Manusia**
- Cukup tanyakan *"Berapa omset kita di periode promo Lebaran?"* atau *"Produk apa yang margin keuntungannya paling tinggi?"*, dan sistem langsung memberikan jawaban akurat berbasis data transaksi riil.

**Grafik Interaktif Otomatis (Plotly.js)**
- Mengubah tabel angka mentah menjadi visualisasi interaktif yang responsif: dilengkapi fitur hover tooltip angka Rupiah presisi, zoom, pan, dan ekspor grafik untuk kebutuhan bahan rapat direksi.

**Konsultasi & Rekomendasi Bisnis Eksekutif**
- Tidak hanya menampilkan angka, AI memberikan analisis kontekstual dalam tabel Markdown rapi: mengapa kategori tertentu mendominasi penjualan, produk mana yang perlu ditambah stoknya, dan wilayah mana yang perlu diberi program loyalitas.

**Ingatan Percakapan Kontekstual (*Conversational Memory*)**
- Pengguna bisa bertanya secara bersambung layaknya berdiskusi dengan analis data pribadi, misalnya: *"Kategori apa yang paling laris?"* lalu dilanjutkan *"Dari kategori itu, siapa pembeli dengan transaksi terbanyak?"*.

**Penjelajah Database Mandiri (*Database Explorer*)**
- Tersedia panel penjelajah tabel e-commerce (`orders`, `order_items`, `products`, `categories`, `customers`, `regions`) lengkap dengan penampil skema DDL asli secara langsung di dalam aplikasi web.

---

## Teknologi & Arsitektur (Tech Stack)

BizInsight AI dibangun dengan standar arsitektur perangkat lunak modern yang modular, berkinerja tinggi, dan siap pakai untuk produksi:

- **Frontend & UI:** React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons, React Markdown (Remark GFM)
- **Backend & API:** Python 3.13, FastAPI (Asynchronous Web Framework), Uvicorn, Server-Sent Events (SSE)
- **Kecerdasan Buatan (LLM):** Google Gemini 3.6 Flash, Groq Open-Source LLMs (Llama 3.3 70B), LiteLLM Multi-Model Failover
- **Desain Agen:** Multi-Agent ReAct Framework, Dynamic Tool Calling Loop
- **Database:** PostgreSQL 16 (Dijalankan menggunakan Docker & Docker Compose)
- **Konektivitas Database:** `ThreadedConnectionPool` (`psycopg2`), Validasi Skema Relasional
- **Validasi & Pengolahan Data:** Pydantic V2, Pandas
- **Visualisasi Data:** Plotly.js, Plotly Express & Graph Objects
- **Pengelolaan Data Uji:** Faker (Simulasi 500+ transaksi e-commerce Indonesia realistis tahun 2026)

---

## Tantangan Teknis & Solusi

**Mencegah AI Mengarang Data / Berhalusinasi**
- *Tantangan:* Model AI generatif sering kali menebak angka secara asal-asalan jika ditanya metrik bisnis penting.
- *Solusi:* Menerapkan batasan sistem di mana agen AI dilarang keras berasumsi angka sebelum berhasil mengeksekusi query faktual ke PostgreSQL melalui `SQLAgent` yang terverifikasi.

**Mengamankan Database dari Perintah Berbahaya**
- *Tantangan:* Menerjemahkan bahasa bebas pengguna menjadi perintah database berisiko memicu kebocoran data atau penghapusan data secara tidak sengaja.
- *Solusi:* Menerapkan filter keamanan ganda: penyaringan regex kata kunci terlarang (`DROP`, `DELETE`, `UPDATE`, `ALTER`) di sisi aplikasi, isolasi sesi database dalam mode *Read-Only* murni, dan pembatasan baris (*row limit*).

**Menjaga Tampilan Web Tetap Responsif (60 FPS) Saat AI Menalar**
- *Tantangan:* Proses penalaran AI yang melibatkan perancangan query, eksekusi database, dan rendering grafik membutuhkan waktu beberapa detik dan berpotensi membuat antarmuka web macet (*freeze*).
- *Solusi:* Memisahkan frontend dan backend secara *decoupled*. Backend FastAPI menjalankan tugas asinkron dan mengalirkan status pemikiran agen secara langsung ke frontend via *Server-Sent Events (SSE)*, sehingga antarmuka React tetap interaktif dan halus tanpa hambatan.

---

## Pembelajaran & Poin Kunci

- **Kekuatan Sistem Multi-Agent:** Memahami bahwa memecah satu masalah analitik yang rumit ke agen-agen spesialis yang fokus (*Router, SQL, Analyst, Chart*) menghasilkan akurasi yang jauh lebih superior dibanding satu agen monolitik.
- **AI untuk Data Nyata (*Text-to-SQL Engine*):** Menguasai cara menjembatani data tabular yang kaku dengan fleksibilitas bahasa alami manusia secara aman, deterministik, dan bebas halusinasi.
- **Keandalan Sistem di Dunia Nyata:** Belajar merancang sistem AI tangguh melalui mekanisme *self-healing query retry* dan *failover multi-model* instan.
- **Rekayasa Perangkat Lunak Full-Stack Menyeluruh:** Mengintegrasikan seluruh siklus rekayasa perangkat lunak modern: dari orkestrasi Docker PostgreSQL, manajemen connection pool Python, pembuatan API asinkron FastAPI, hingga desain antarmuka kaca buram (*Frosted Glass*) interaktif berbasis React 19 dan Tailwind CSS v4.

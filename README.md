<p align="center">
<img src="html/dist/img/kasirku.png" width="128" height="128" alt="KasirKu Logo">
</p>

<h1 align="center">KasirKu</h1>

<p align="center">
<strong>Simple & Efficient Point of Sale (PoS) System</strong>
</p>

<p align="center">
<img src="https://img.shields.io/badge/Bun-000000?style=for-the-badge&logo=bun&logoColor=white" alt="Bun">
<img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker">
<img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript">
</p>
<hr>

**KasirKu** adalah aplikasi **Point of Sale (PoS)** yang dibuat untuk membantu pemilik usaha mengelola transaksi kasir dengan lebih mudah.

## Table of contents
- [Fitur](#fitur)
- [Requrements](#requirements)
- [Cara Menjalankan](#cara-menjalankan)
  - [Menggunakan Bun](#pakai-bun)
  - [Pakai Docker](#pakai-docker)
- [Configuration](#configuration)
  - [Example Config](#example-config)
  - [Configuration Options](#configuration-options)
    - [General Settings](#general-settings)
    - [Database Specifics](#database-specifics)
      - [PostgreSQL Configuration](#postgresql-configuration)
      - [MySQL Configurations](#mysql-configuration)
  - [Notes](#notes)
  - [Automatic Setup](#automatic-setup)
- [Akses](#akses)
- [QnA](#qna)
  - [Q: Kenapa Anda membuat aplikasi ini?](#q-kenapa-anda-membuat-aplikasi-ini)
  - [Q: Target pengguna KasirKu itu siapa aja?](#q-target-pengguna-kasirku-itu-siapa-aja)
  - [Q: Kenapa KasirKu dibuat open-source?](#q-kenapa-kasirku-dibuat-open-source)
  - [Q: Kenapa orang harus menggunakan KasirKu dibanding aplikasi kasir lain?](#q-kenapa-orang-harus-menggunakan-kasirku-dibanding-aplikasi-kasir-lain)
  - [Q: Dulu namanya `aplikasikasir`. Kenapa diganti menjadi `KasirKu`?](#q-dulu-namanya-aplikasikasir-kenapa-diganti-menjadi-kasirku)
  - [Q: Dulu project ini menggunakan bahasa C. Kenapa sekarang diganti ke Bun.JS?](#q-dulu-project-ini-menggunakan-bahasa-c-kenapa-sekarang-diganti-ke-bunjs)
  - [Q: Berarti versi C Programming-nya hilang dong?](#q-berarti-versi-c-programming-nya-hilang-dong)
  - [Q: Kenapa waktu itu anda menggunakan bahasa C?](#q-kenapa-waktu-itu-anda-menggunakan-bahasa-c)
  - [Q: Kapan anda melanjutkan project ini dan mengapa anda melanjutkan project ini?](#q-kapan-anda-melanjutkan-project-ini-dan-mengapa-anda-melanjutkan-project-ini)
  - [Q: Kalo misalnya Anda menggunakan Bun.JS, berarti dependencies / resource nya akan berat dong?](#q-kalo-misalnya-anda-menggunakan-bunjs-berarti-dependencies--resource-nya-akan-berat-dong)
  - [Q: Pelajaran apa yang bisa diambil dari project ini?](#q-pelajaran-apa-yang-bisa-diambil-dari-project-ini)
- [Credit](#credit)

## Fitur
- **Point of Sale System**  
  Mendukung proses transaksi penjualan barang secara cepat dan sederhana.
- **Manajemen Barang**  
  Menambahkan, mengedit, dan menghapus data barang yang dijual.
- **Dashboard**  
  Dashboard interaktif yang menampilkan statistik toko secara realtime, termasuk:
  - Informasi Total Hari Ini (Total Barang Terjual, Penjualan, Keuntungan, Pengeluaran, Pendapatan)
  - Informasi Barang Kosong
  - Barang Total Terjual
- **Pembukuan**  
  Mencatat transaksi keuangan toko termasuk pemasukan, pengeluaran, serta perhitungan keuntungan dari hasil penjualan (Laporan).
- **User Management**  
  Mengelola akun pengguna dalam sistem, termasuk:
  - Mengubah profil pengguna seperti foto profil, username, dan password
  - Menambahkan, mengedit, dan menghapus pengguna
  - Mengatur role dan permission untuk membatasi akses ke fitur tertentu
- **Realtime Update (Server-Sent Event)**  
  Perubahan data dapat langsung tersinkron secara realtime tanpa reload halaman.
- **Single Page Application (SPA)**  
  Navigasi halaman cepat tanpa reload penuh.
- **Responsive UI**  
  Antarmuka berbasis AdminLTE yang nyaman digunakan di berbagai ukuran layar.
- **Dark Mode**  
  Mendukung tampilan terang dan gelap.
- **Session Authentication**  
  Sistem login dengan session untuk keamanan akses.
- **Assets Optimization & Compression**  
  File HTML dan JavaScript di-*minify* serta dikompresi menggunakan Brotli untuk mengurangi ukuran file, menghemat bandwidth, dan meningkatkan kecepatan loading halaman.
- **Minimal Dependency**  
  Backend ringan menggunakan Bun dan TypeScript dengan dependensi minimal.
- **Dukungan Multi Database**  
  Mendukung SQLite, MySQL, dan PostgreSQL.
- **Docker Support**  
  Dapat dijalankan dengan mudah menggunakan container Docker.

## Requirements
### Server
- CPU: 1 vCPU (64 bit)
- RAM: 256 MB (512 MB recommended)
- Storage: 1 GB (5 GB recommended)
- OS: Linux / Windows / macOS / Android (Termux)
### Browser
KasirKu dapat dijalankan di browser modern seperti:
- Chrome 
- Firefox
- Edge
- Safari

## Cara Menjalankan
### Pakai Bun
Pastikan [Bun](https://bun.sh) sudah terinstall.

```
bun install
bun run index.ts
```

### Pakai Docker
```bash
docker build -t kasirku .
docker run -d -p 80:80 -p 443:443 kasirku
```

Jika mau pakai volume:
```bash
docker run -d -p 80:80 -p 443:443 \
  -v kasirku-db:/app/database \
  -v kasirku-cert:/app/cert \
  -v kasirku-profile:/app/profile_img \
  kasirku
```

## Configuration

KasirKu menggunakan file konfigurasi bernama `config.json` yang berada di root project.

Jika file ini tidak ditemukan, KasirKu akan menjalankan setup untuk membuat konfigurasi secara otomatis.

### Example Config
```json
{
    "listen_port": 443,
    "compile_html": false,
    "db_type": "sqlite",
    "db_name": "kasirku",
    "postgresql": {
        "host": "127.0.0.1",
        "port": 5432,
        "user": "root",
        "password": "admin"
    },
    "mysql": {
        "host": "127.0.0.1",
        "port": 3306,
        "user": "root",
        "password": "root"
    }
}
```

### Configuration Options
#### General Settings
| Key | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `listen_port` | `Number` | `443` | Port server HTTPS. (Alt: `8443`) |
| `compile_html` | `Boolean` | `false` | Compile HTML saat startup jika `true`. |
| `db_type` | `String` | `sqlite` | Jenis database: `sqlite`, `mysql`, atau `postgresql`. |
| `db_name` | `String` | `kasirku` | Nama database (disarankan lowercase). |

---

#### Database Specifics

##### PostgreSQL Configuration
Digunakan jika `db_type: "postgresql"`
* **Host:** `postgresql.host` (Contoh: `127.0.0.1`)
* **Port:** `postgresql.port` (Default: `5432`)
* **User:** `postgresql.user`
* **Password:** `postgresql.password`

##### MySQL Configuration
Digunakan jika `db_type: "mysql"`
* **Host:** `mysql.host` (Contoh: `127.0.0.1`)
* **Port:** `mysql.port` (Default: `3306`)
* **User:** `mysql.user`
* **Password:** `mysql.password`

---

### Notes
* Jika menggunakan **SQLite**, konfigurasi MySQL dan PostgreSQL akan **diabaikan**.
* Sistem hanya akan membaca konfigurasi yang sesuai dengan nilai `db_type`.

### Automatic Setup
Jika `config.json` tidak ditemukan saat startup, **KasirKu** akan:
1. Menanyakan konfigurasi via CLI.
2. Menampilkan preview konfigurasi.
3. Membuat file `config.json` secara otomatis.

## Akses
Buka `https://localhost` di browser, dan untuk default Username / Password: `admin` / `admin`.

## QnA
### Q: Kenapa Anda membuat aplikasi ini?

A: Orang tua saya mempunyai toko, dan dari situ saya kepikiran untuk membuat aplikasi kasir sendiri.  
Akhirnya pada saat saya masih **SMK kelas 2**, saya mulai bikin aplikasi ini.

---

### Q: Target pengguna KasirKu itu siapa aja?

A: Target pengguna **KasirKu** adalah:

- **Toko kecil / warung**
- **UMKM (Usaha Mikro, Kecil, dan Menengah)**

Aplikasi ini dibuat supaya bisa membantu pemilik usaha kecil dalam mencatat dan mengelola penjualan dengan cara yang lebih mudah dan simpel.

---

### Q: Kenapa KasirKu dibuat open-source?

A: Saya membuat project ini **open-source** karena beberapa alasan:

- Supaya aplikasi ini bisa **terus berkembang**
- Supaya **orang lain bisa belajar** dari project ini
- Supaya orang lain juga bisa **berkontribusi dan membantu mengembangkan project ini**
- Supaya project ini bisa **berguna bagi lebih banyak orang**

---

### Q: Kenapa orang harus menggunakan KasirKu dibanding aplikasi kasir lain?

A: Karena aplikasi **KasirKu** dibuat dengan fokus pada kesederhanaan, performa, dan kemudahan penggunaan.

Beberapa keunggulannya:

- Ringan dan tidak membutuhkan resource besar
- Open-source, jadi siapa saja bisa melihat dan mempelajari source code-nya
- Bisa berjalan di hardware low-end (misalnya perangkat lama)
- Realtime data, jadi tidak perlu refresh halaman (menggunakan **SSE**)
- Menggunakan SPA (Single Page Application), sehingga perpindahan halaman terasa lebih cepat tanpa reload

---

### Q: Dulu namanya `aplikasikasir`. Kenapa diganti menjadi `KasirKu`?

A: Menurut saya... nama itu terasa seperti hanya deskripsi aplikasi saja, bukan sebuah brand.

Karena itu saya mengganti namanya menjadi **KasirKu**, supaya:

- Lebih mudah diingat
- Terasa seperti sebuah brand
- Lebih enak disebut

---

### Q: Dulu project ini menggunakan bahasa C. Kenapa sekarang diganti ke Bun.JS?

A: Karena... jujur saja lumayan susah wkwkwk 😂

Tapi bukan cuma itu aja alasannya.

Beberapa alasan kenapa saya pindah dari **C** ke **Bun.JS**:

- Code C cukup sulit dibaca dan dikembangkan
- Orang lain jadi lebih sulit berkontribusi ke project
- Development bisa jadi jauh lebih lama

Kalau project ini tetap menggunakan **C sampai sekarang**, kemungkinan besar perkembangannya akan jauh lebih lambat.

Akhirnya saya memutuskan untuk menggunakan **Bun.JS**.

Kenapa **Bun.JS**?

Karena:
- Mirip seperti **Node.JS**
- Lebih mudah untuk dikembangkan
- Performa sangat cepat
- Development experience lebih enak

---

### Q: Berarti versi C Programming-nya hilang dong?

A: Tidak hilang.

Versi **C Programming** masih ada, tetapi sudah dipindahkan ke branch [legacy](https://github.com/KevinAdhaikal/KasirKu/tree/legacy).

---

### Q: Kenapa waktu itu anda menggunakan bahasa C?

A: Saya menggunakan bahasa **C** pada waktu itu karena saya ingin mencoba belajar bahasa C dengan cara membuat aplikasi ini.

Dan ternyata... **susah juga** 😂  
Akhirnya saya memutuskan untuk beralih ke **Bun.JS**, wkwk.

Tapi bukan cuma itu alasannya. Saya juga sempat memilih **C Programming** karena beberapa hal:

- Supaya aplikasinya bisa berjalan di **hardware low-end** (seperti Set-Top Box bekas, Android bekas, dan perangkat lama lainnya)
- Waktu itu saya juga lagi **tergila-gila dengan optimasi performa**

Dan ternyata... project ini malah **mangkrak sekitar 1 tahun**.

Akhirnya setelah cukup lama berhenti, saya memutuskan untuk melanjutkan project ini lagi 😂

---

### Q: Kapan anda melanjutkan project ini dan mengapa anda melanjutkan project ini?

A: Saya mulai melanjutkan project ini sekitar **bulan puasa**, kira-kira **3 Maret 2026**.

Saya melanjutkan project ini dengan beberapa alasan:

- Untuk **portofolio** saya
- Supaya aplikasi ini bisa **bermanfaat dan digunakan oleh orang lain**
- Mengisi **waktu luang** dengan membuat project
- Belajar lebih dalam lagi tentang:
  - Programming
  - Database
  - Basic security
  - Basic networking (seperti **Realtime SSE**, Query, dll)

---

### Q: Kalo misalnya Anda menggunakan Bun.JS, berarti dependencies / resource nya akan berat dong?

A: Saya tetap usahakan agar aplikasi **KasirKu** ini bisa **ringan dan cepat**.

Walaupun menggunakan **Bun.JS**, saya tetap berusaha untuk:
- Tidak menggunakan dependencies yang berlebihan
- Menjaga performa aplikasi supaya tetap cepat
- Tetap memperhatikan aspek **keamanan**

Jadi walaupun bukan lagi menggunakan bahasa **C**, tujuan saya tetap sama:  
membuat aplikasi kasir yang **ringan, cepat, dan aman untuk digunakan.**

---

### Q: Pelajaran apa yang bisa diambil dari project ini?

A: Hmmmm... pelajaran yang bisa diambil dari project ini sih...

#### Jangan mempersulit diri sendiri & jangan membuat sesuatu yang gampang menjadi sulit

Waktu saya membuat aplikasi ini dengan **bahasa C**, sebenarnya saya malah **mempersulit diri saya sendiri**.

Sesuatu yang sebenarnya bisa dibuat **lebih simpel dan mudah**, malah jadi **sangat rumit**. Akibatnya development jadi lambat, bahkan sempat membuat **project ini mangkrak kurang lebih selama 1 tahun**.

Padahal sebenarnya ada bahasa pemrograman lain yang **lebih mudah untuk dikembangkan**, lebih mudah dibaca, dan juga **lebih mudah untuk orang lain yang ingin berkontribusi ke project ini**.

Dari situ saya belajar bahwa kadang kita tidak perlu selalu memilih solusi yang paling "low level" atau paling "optimal".  
Yang penting adalah **project bisa berkembang, bisa diselesaikan, dan bisa digunakan oleh orang lain.**

## Credit
- AdminLTE 3 Template by [AdminLTE.io](https://adminlte.io/)
- Icon Cash Register by [Kameleon (icon-icons.com)](https://icon-icons.com/icon/cashier-cash-register/118071)
- NProgress by [rstacruz](https://github.com/rstacruz/nprogress)
- 404 Not Found Template by [colorlib](https://colorlib.com/wp/template/colorlib-error-404-1/)

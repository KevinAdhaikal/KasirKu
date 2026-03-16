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
- **Dark Mode**  
  Mendukung tampilan terang dan gelap.
- **Session Authentication**  
  Sistem login dengan session untuk keamanan akses.
- **Responsive UI**  
  Antarmuka berbasis AdminLTE yang nyaman digunakan di berbagai ukuran layar.
- **Minimal Dependency**  
  Backend ringan menggunakan Bun dan TypeScript.
- **Docker Support**  
  Dapat dijalankan dengan mudah menggunakan container Docker.

## Requirements
### Server
- CPU: 1 vCPU (64 bit)
- RAM: 256 MB (512 MB recommended)
- Storage: 1 GB (5 GB recommended)
- OS: Linux / Windows / macOS / Android
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
  -v kasirku-profile:/app/html/profile_img \
  kasirku
```

## Akses
Buka `https://localhost` di browser. Login default: `admin` / `admin`.

# Credit
- AdminLTE 3 Template by [AdminLTE.io](https://adminlte.io/)
- Icon Cash Register by [Kameleon (icon-icons.com)](https://icon-icons.com/icon/cashier-cash-register/118071)
- NProgress by [rstacruz](https://github.com/rstacruz/nprogress)
- 404 Not Found Template by [colorlib](https://colorlib.com/wp/template/colorlib-error-404-1/)

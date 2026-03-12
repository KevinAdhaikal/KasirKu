<h1 align="center">KasirKu</h1>
<p align="center">
A simple Point of Sale (PoS) application to help businesses manage their cashier system.
</p>

**KasirKu** adalah aplikasi **Point of Sale (PoS)** yang dibuat untuk membantu pemilik usaha mengelola transaksi kasir dengan lebih mudah.

## Cara Menjalankan

### Pakai Bun

Pastikan [Bun](https://bun.sh) sudah terinstall.

```bash
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

### Akses

Buka `https://localhost` di browser. Login default: `admin` / `admin`.

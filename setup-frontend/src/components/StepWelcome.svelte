<script lang="ts">
  const checklist = [
    { title: 'Port Layanan', desc: 'Menentukan port web (standar 80 untuk HTTP atau 443 untuk HTTPS).' },
    { title: 'Basis Data', desc: 'Mendukung SQLite lokal (tanpa instalasi server) atau MySQL/PostgreSQL terpusat.' },
    { title: 'Akun Pengelola', desc: 'Membuat akun Superadmin utama untuk login dan manajemen kasir.' },
    { title: 'Informasi Toko', desc: 'Menyimpan nama dan alamat usaha yang akan dicetak pada bukti pembayaran.' },
  ];
</script>

<div class="space-y-6">
  <!-- Header -->
  <div class="flex items-start gap-4 pb-5 border-b border-border">
    <div class="w-12 h-12 rounded-lg bg-subtle border border-border p-2 shrink-0 flex items-center justify-center">
      <img src="/img/kasirku.png" alt="KasirKu Logo" class="w-full h-full object-contain" />
    </div>
    <div class="space-y-1">
      <h2 class="text-lg font-medium text-text-primary">Instalasi KasirKu PoS</h2>
      <p class="text-sm text-text-secondary">
        Panduan langkah demi langkah untuk menyiapkan koneksi server, basis data, dan akun pengelola toko Anda.
      </p>
    </div>
  </div>

  <!-- Step Breakdown List -->
  <div class="space-y-3">
    <h3 class="text-xs font-medium text-text-muted">Tahapan yang akan dikonfigurasi:</h3>
    
    <div class="border border-border rounded-lg divide-y divide-border bg-subtle/30">
      {#each checklist as item, idx}
        <div class="p-3.5 flex items-start gap-3">
          <div class="w-5 h-5 rounded border border-border bg-surface text-text-secondary text-xs flex items-center justify-center shrink-0 mt-0.5 font-mono">
            {idx + 1}
          </div>
          <div class="space-y-0.5">
            <div class="text-sm font-medium text-text-primary">{item.title}</div>
            <div class="text-xs text-text-secondary">{item.desc}</div>
          </div>
        </div>
      {/each}
    </div>
  </div>

  <!-- Notice -->
  <div class="p-3.5 rounded-lg bg-subtle/60 border border-border text-xs text-text-secondary leading-relaxed">
    Konfigurasi akan ditulis ke berkas lingkungan sistem (<code class="font-mono text-text-primary px-1 bg-surface border border-border rounded">.env</code>). Anda dapat memulai instalasi baru kapan saja atau mengubah pengaturan lanjutan di kemudian hari melalui dashboard admin.
  </div>
</div>

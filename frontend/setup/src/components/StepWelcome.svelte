<script lang="ts">
  import { 
    ArrowRight, 
    Server, 
    Database, 
    ShieldCheck, 
    Receipt
  } from 'lucide-svelte';

  interface Props {
    onStart?: () => void;
  }

  let { onStart }: Props = $props();

  const setupTopics = [
    {
      title: 'Jaringan & Port Server',
      desc: 'Tentukan protokol komunikasi (HTTP atau HTTPS) dan nomor port yang digunakan.',
      icon: Server,
    },
    {
      title: 'Mesin & Koneksi Database',
      desc: 'Pilih mesin database (SQLite, MySQL, atau PostgreSQL) untuk data transaksi.',
      icon: Database,
    },
    {
      title: 'Akun Administrator',
      desc: 'Buat akun pengelola utama (Superadmin) untuk masuk ke dashboard kasir.',
      icon: ShieldCheck,
    },
    {
      title: 'Profil Toko',
      desc: 'Lengkapi nama toko, alamat, dan nomor kontak untuk identitas toko dan akan dicetak di struk belanja.',
      icon: Receipt,
    },
  ];
</script>

<div class="space-y-7 text-ink">
  <!-- Title & Intro -->
  <div class="space-y-2 border-b border-line pb-5">
    <h1 class="text-2xl font-bold text-ink tracking-tight">
      Selamat Datang di KasirKu
    </h1>
    <p class="text-sm sm:text-base text-ink-muted leading-relaxed max-w-2xl">
      Panduan ini akan membantu Anda mengonfigurasi pengaturan awal sistem kasir dengan mudah dan cepat.
    </p>
  </div>

  <!-- Topics Overview -->
  <div class="space-y-3.5">
    <div class="text-sm font-semibold text-ink">
      Tahapan yang akan dikonfigurasi:
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {#each setupTopics as topic}
        {@const Icon = topic.icon}
        <div class="p-5 rounded-2xl bg-subtle/50 border border-line flex items-start gap-4">
          <div class="w-10 h-10 rounded-xl bg-surface border border-line flex items-center justify-center text-brand shrink-0 mt-0.5 shadow-xs">
            <Icon class="w-5 h-5" />
          </div>
          <div class="space-y-1">
            <div class="text-sm sm:text-base font-semibold text-ink">
              {topic.title}
            </div>
            <p class="text-xs sm:text-sm text-ink-muted leading-relaxed">
              {topic.desc}
            </p>
          </div>
        </div>
      {/each}
    </div>
  </div>
</div>

<script lang="ts">
  import { CheckCircle2 } from 'lucide-svelte';
  import type { DatabaseConfig, DatabaseType } from '../types';

  interface Props {
    config: DatabaseConfig;
  }

  let { config = $bindable() }: Props = $props();

  function selectEngine(type: DatabaseType) {
    config.type = type;
    if (type === 'sqlite') {
      config.name = 'kasirku';
    } else if (type === 'mysql') {
      config.port = 3306;
      config.name = 'kasirku';
    } else if (type === 'postgresql') {
      config.port = 5432;
      config.name = 'kasirku';
    }
  }
</script>

<div class="space-y-6">
  <!-- Title -->
  <div>
    <h2 class="text-lg font-medium text-text-primary">Pilih Mesin Basis Data</h2>
    <p class="text-sm text-text-secondary mt-0.5">
      Tentukan jenis database yang digunakan untuk menyimpan data produk dan transaksi.
    </p>
  </div>

  <!-- Engine Selection Cards -->
  <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
    <!-- SQLite -->
    <button
      type="button"
      onclick={() => selectEngine('sqlite')}
      class="p-4 rounded-lg border text-left transition-colors cursor-pointer flex flex-col justify-between {config.type === 'sqlite' ? 'border-brand bg-brand/5 ring-1 ring-brand/30' : 'border-border bg-surface hover:bg-subtle/50'}"
    >
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <div class="w-10 h-10 rounded border border-border bg-subtle/40 p-1.5 flex items-center justify-center">
            <img src="/img/sqlite.png" alt="SQLite" class="w-full h-full object-contain" />
          </div>
          {#if config.type === 'sqlite'}
            <CheckCircle2 class="w-4 h-4 text-brand shrink-0" />
          {/if}
        </div>

        <div>
          <h3 class="font-medium text-text-primary text-sm">SQLite</h3>
          <p class="text-xs text-text-secondary mt-1 leading-relaxed">
            Database file lokal. Tanpa perlu install server atau konfigurasi jaringan.
          </p>
        </div>
      </div>

      <div class="pt-3 mt-3 border-t border-border text-xs text-text-muted">
        Cocok untuk 1 komputer kasir
      </div>
    </button>

    <!-- MySQL -->
    <button
      type="button"
      onclick={() => selectEngine('mysql')}
      class="p-4 rounded-lg border text-left transition-colors cursor-pointer flex flex-col justify-between {config.type === 'mysql' ? 'border-brand bg-brand/5 ring-1 ring-brand/30' : 'border-border bg-surface hover:bg-subtle/50'}"
    >
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <div class="w-10 h-10 rounded border border-border bg-subtle/40 p-1.5 flex items-center justify-center">
            <img src="/img/mysql.png" alt="MySQL" class="w-full h-full object-contain" />
          </div>
          {#if config.type === 'mysql'}
            <CheckCircle2 class="w-4 h-4 text-brand shrink-0" />
          {/if}
        </div>

        <div>
          <h3 class="font-medium text-text-primary text-sm">MySQL / MariaDB</h3>
          <p class="text-xs text-text-secondary mt-1 leading-relaxed">
            Database relasional standar untuk menghubungkan banyak kasir ke satu server pusat.
          </p>
        </div>
      </div>

      <div class="pt-3 mt-3 border-t border-border text-xs text-text-muted">
        Cocok untuk multi-kasir
      </div>
    </button>

    <!-- PostgreSQL -->
    <button
      type="button"
      onclick={() => selectEngine('postgresql')}
      class="p-4 rounded-lg border text-left transition-colors cursor-pointer flex flex-col justify-between {config.type === 'postgresql' ? 'border-brand bg-brand/5 ring-1 ring-brand/30' : 'border-border bg-surface hover:bg-subtle/50'}"
    >
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <div class="w-10 h-10 rounded border border-border bg-subtle/40 p-1.5 flex items-center justify-center">
            <img src="/img/postgresql.svg" alt="PostgreSQL" class="w-full h-full object-contain" />
          </div>
          {#if config.type === 'postgresql'}
            <CheckCircle2 class="w-4 h-4 text-brand shrink-0" />
          {/if}
        </div>

        <div>
          <h3 class="font-medium text-text-primary text-sm">PostgreSQL</h3>
          <p class="text-xs text-text-secondary mt-1 leading-relaxed">
            Database relasional tangguh untuk kebutuhan data besar dan integritas tinggi.
          </p>
        </div>
      </div>

      <div class="pt-3 mt-3 border-t border-border text-xs text-text-muted">
        Skala besar & handal
      </div>
    </button>
  </div>

  <!-- Note -->
  <div class="p-3.5 rounded-lg bg-subtle/60 border border-border text-xs text-text-secondary">
    {#if config.type === 'sqlite'}
      Database SQLite akan otomatis dibuat sebagai berkas lokal di direktori data aplikasi.
    {:else}
      Pastikan server {config.type === 'mysql' ? 'MySQL' : 'PostgreSQL'} Anda sudah aktif dan port dapat diakses dari mesin ini.
    {/if}
  </div>
</div>

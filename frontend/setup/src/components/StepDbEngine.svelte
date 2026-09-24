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

  const engines: {
    type: DatabaseType;
    name: string;
    desc: string;
    suitableFor: string;
    logo: string;
  }[] = [
    {
      type: 'sqlite',
      name: 'SQLite',
      desc: 'Database file lokal tanpa instalasi server tambahan. Praktis dan langsung siap pakai.',
      suitableFor: 'Untuk toko kecil dengan satu komputer',
      logo: '/img/sqlite.png',
    },
    {
      type: 'mysql',
      name: 'MySQL / MariaDB',
      desc: 'Database server yang dapat digunakan oleh beberapa komputer dan cocok untuk berbagai ukuran bisnis.',
      suitableFor: 'Untuk toko dengan beberapa komputer atau kebutuhan yang terus berkembang',
      logo: '/img/mysql.png',
    },
    {
      type: 'postgresql',
      name: 'PostgreSQL',
      desc: 'Database yang kuat dan fleksibel untuk aplikasi dengan kebutuhan data yang lebih kompleks.',
      suitableFor: 'Untuk bisnis dengan kebutuhan data yang lebih kompleks',
      logo: '/img/postgresql.svg',
    },
  ];
</script>

<div class="space-y-6 text-ink">
  <!-- Title Header -->
  <div class="space-y-1.5 border-b border-line pb-4">
    <h2 class="text-xl font-bold text-ink tracking-tight">Pilih Mesin Basis Data</h2>
    <p class="text-sm text-ink-muted leading-relaxed">
      Tentukan jenis database yang digunakan untuk menyimpan data produk, stok, dan transaksi penjualan.
    </p>
  </div>

  <!-- Engine Selection Cards Matrix -->
  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
    {#each engines as engine}
      {@const isSelected = config.type === engine.type}

      <button
        type="button"
        onclick={() => selectEngine(engine.type)}
        class="p-5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between select-none {isSelected ? 'border-brand bg-brand-soft/30 ring-1 ring-brand/30 shadow-xs' : 'border-line bg-surface hover:bg-subtle/50'}"
      >
        <div class="space-y-4">
          <!-- Logo & Selection Indicator -->
          <div class="flex items-center justify-between">
            <div class="w-12 h-12 rounded-xl border border-line bg-surface p-2 flex items-center justify-center shrink-0 shadow-xs">
              <img src={engine.logo} alt={engine.name} class="w-full h-full object-contain" />
            </div>

            {#if isSelected}
              <CheckCircle2 class="w-6 h-6 text-brand shrink-0" />
            {:else}
              <div class="w-5 h-5 rounded-full border border-line"></div>
            {/if}
          </div>

          <!-- Engine Title & Description -->
          <div class="space-y-1.5">
            <h3 class="font-bold text-ink text-base">
              {engine.name}
            </h3>
            <p class="text-xs sm:text-sm text-ink-muted leading-relaxed">
              {engine.desc}
            </p>
          </div>
        </div>

        <!-- Target Topology Footer -->
        <div class="pt-3.5 mt-4 border-t border-line text-xs text-ink-faint">
          {engine.suitableFor}
        </div>
      </button>
    {/each}
  </div>
</div>

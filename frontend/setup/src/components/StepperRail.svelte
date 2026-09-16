<script lang="ts">
  import { Check } from 'lucide-svelte';
  import type { StepId, ServerConfig, DatabaseConfig, AdminConfig, StoreConfig } from '../types';

  interface Props {
    currentStep: StepId;
    serverConfig?: ServerConfig;
    dbConfig?: DatabaseConfig;
    adminConfig?: AdminConfig;
    storeConfig?: StoreConfig;
    onSelectStep?: (step: StepId) => void;
  }

  let {
    currentStep,
  }: Props = $props();

  const steps = [
    { id: 1 as StepId, label: 'Selamat Datang', desc: 'Pengantar instalasi sistem' },
    { id: 2 as StepId, label: 'Jaringan & Port', desc: 'Protokol dan port server' },
    { id: 3 as StepId, label: 'Mesin Database', desc: 'SQLite, MySQL, atau PostgreSQL' },
    { id: 4 as StepId, label: 'Koneksi Database', desc: 'Parameter dan kredensial' },
    { id: 5 as StepId, label: 'Akun Administrator', desc: 'Pengaturan superadmin' },
    { id: 6 as StepId, label: 'Profil Toko', desc: 'Identitas toko' },
  ];
</script>

<aside class="w-full md:w-80 shrink-0 flex flex-col justify-between overflow-y-auto">
  <!-- Steps Navigation Container (Read-only Step Progress) -->
  <div class="p-5 rounded-2xl bg-surface border border-line space-y-4">
    <div class="text-xs text-ink-faint font-semibold uppercase tracking-wider px-1">
      Tahapan Instalasi
    </div>

    <!-- Steps List -->
    <div class="space-y-1.5" aria-label="Langkah Instalasi">
      {#each steps as step}
        {@const isCompleted = step.id < currentStep}
        {@const isCurrent = step.id === currentStep}

        <div
          class="w-full text-left flex items-start gap-3.5 p-3 rounded-xl transition-colors select-none {isCurrent ? 'bg-subtle text-ink font-medium shadow-xs' : isCompleted ? 'text-ink-muted' : 'text-ink-muted opacity-75'}"
        >
          <!-- Step Indicator -->
          <div
            class="w-7 h-7 rounded-full flex items-center justify-center text-xs shrink-0 mt-0.5 transition-colors {isCompleted ? 'bg-success/15 text-success font-semibold' : isCurrent ? 'bg-brand text-white font-semibold' : 'bg-subtle border border-line text-ink-faint'}"
          >
            {#if isCompleted}
              <Check class="w-4 h-4 stroke-[2.5]" />
            {:else}
              <span>{step.id}</span>
            {/if}
          </div>

          <!-- Step Label & Desc -->
          <div class="flex-1 min-w-0">
            <div class="text-sm {isCurrent ? 'font-semibold text-ink' : isCompleted ? 'font-medium text-ink' : 'text-ink-muted'} truncate">
              {step.label}
            </div>
            <div class="text-xs text-ink-faint truncate mt-0.5">
              {step.desc}
            </div>
          </div>
        </div>
      {/each}
    </div>
  </div>
</aside>

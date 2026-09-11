<script lang="ts">
  import { ArrowLeft, ArrowRight, Check, Moon, RefreshCw, Sun } from 'lucide-svelte';
  import { theme } from './theme.svelte';
  import type { StepId, ServerConfig, DatabaseConfig, AdminConfig, StoreConfig } from './types';
  
  import StepWelcome from './components/StepWelcome.svelte';
  import StepServer from './components/StepServer.svelte';
  import StepDbEngine from './components/StepDbEngine.svelte';
  import StepDbConfig from './components/StepDbConfig.svelte';
  import StepAdmin from './components/StepAdmin.svelte';
  import StepStore from './components/StepStore.svelte';
  import StepInstall from './components/StepInstall.svelte';
  import MigrationModal from './components/MigrationModal.svelte';

  let currentStep = $state<StepId>(1);

  let stepServerRef = $state<any>();
  let stepDbConfigRef = $state<any>();
  let stepAdminRef = $state<any>();
  let checkingDb = $state(false);

  let serverConfig = $state<ServerConfig>({
    protocol: 'http',
    port: 80,
    compile_html: false,
    tls: {
      mode: 'generate',
    },
  });

  let dbConfig = $state<DatabaseConfig>({
    type: 'sqlite',
    host: 'localhost',
    port: 3306,
    name: 'kasirku.db',
    user: 'root',
    pass: '',
    db_new_migrate: false,
  });

  let adminConfig = $state<AdminConfig>({
    full_name: '',
    username: '',
    password: '',
    confirm_password: '',
  });

  let storeConfig = $state<StoreConfig>({
    store_name: '',
    store_desc: '',
    store_address: '',
    store_phone_num: '',
  });

  let migrationModalOpen = $state(false);
  let oldDbVersion = $state<string | undefined>(undefined);

  function handleOldDbFound(version?: string) {
    oldDbVersion = version;
    migrationModalOpen = true;
  }

  function handleMigrationChoice(resetDb: boolean) {
    dbConfig.db_new_migrate = resetDb;
    migrationModalOpen = false;
    currentStep = 5;
  }

  function handleBack() {
    if (currentStep > 1 && currentStep < 7) {
      currentStep = (currentStep - 1) as StepId;
    }
  }

  async function handleNext() {
    if (currentStep === 1) {
      currentStep = 2;
    } else if (currentStep === 2) {
      const ok = stepServerRef?.proceed();
      if (ok) currentStep = 3;
    } else if (currentStep === 3) {
      currentStep = 4;
    } else if (currentStep === 4) {
      await stepDbConfigRef?.proceed();
    } else if (currentStep === 5) {
      const ok = stepAdminRef?.proceed();
      if (ok) currentStep = 6;
    } else if (currentStep === 6) {
      currentStep = 7;
    }
  }

  const steps = [
    { id: 1, label: 'Selamat Datang', desc: 'Pengantar instalasi' },
    { id: 2, label: 'Jaringan & Port', desc: 'Protokol dan port server' },
    { id: 3, label: 'Mesin Basis Data', desc: 'SQLite, MySQL, Postgres' },
    { id: 4, label: 'Koneksi Basis Data', desc: 'Parameter dan kredensial' },
    { id: 5, label: 'Akun Administrator', desc: 'Kredensial superadmin' },
    { id: 6, label: 'Profil Toko', desc: 'Informasi struk kasir' },
  ];

  let nextButtonLabel = $derived.by(() => {
    if (checkingDb) return 'Memeriksa...';
    return 'Lanjut';
  });
</script>

<div class="h-screen flex flex-col bg-canvas text-text-primary overflow-hidden selection:bg-brand/20 selection:text-brand relative pb-14">
  <!-- Header -->
  <header class="h-14 border-b border-border bg-surface shrink-0 px-4">
    <div class="max-w-5xl mx-auto h-full flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded border border-border p-1 flex items-center justify-center bg-subtle/50">
          <img src="/img/kasirku.png" alt="KasirKu Logo" class="w-full h-full object-contain" />
        </div>
        <div class="flex items-baseline gap-2.5">
          <span class="font-medium text-base text-text-primary tracking-tight">KasirKu</span>
          <span class="text-sm text-text-secondary">Instalasi Sistem</span>
        </div>
      </div>

      <!-- Theme Switcher -->
      <button
        type="button"
        onclick={() => theme.toggle()}
        aria-label={theme.isDark ? 'Ganti ke Mode Terang' : 'Ganti ke Mode Gelap'}
        title={theme.isDark ? 'Ganti ke Mode Terang' : 'Ganti ke Mode Gelap'}
        class="w-8 h-8 rounded-lg border border-border hover:bg-subtle text-text-secondary hover:text-text-primary flex items-center justify-center transition-colors cursor-pointer"
      >
        {#if theme.isDark}
          <Sun class="w-4 h-4 text-amber-400" />
        {:else}
          <Moon class="w-4 h-4 text-text-secondary" />
        {/if}
      </button>
    </div>
  </header>

  <!-- Main Fixed Container -->
  <div class="flex-1 max-w-5xl mx-auto w-full px-4 py-5 flex flex-col md:flex-row gap-5 min-h-0 overflow-hidden">
    <!-- Stepper Rail (Sidebar) -->
    <aside class="w-full md:w-60 shrink-0 flex flex-col justify-between overflow-y-auto">
      <div class="p-3.5 rounded-lg bg-surface border border-border space-y-3">
        <div class="text-xs text-text-muted px-1">
          {#if currentStep <= steps.length}
            Langkah {currentStep} dari {steps.length}
          {:else}
            Eksekusi Instalasi
          {/if}
        </div>

        <nav class="space-y-1" aria-label="Steps">
          {#each steps as step}
            {@const isCompleted = step.id < currentStep}
            {@const isCurrent = step.id === currentStep}

            <div 
              class="flex items-start gap-2.5 p-2 rounded-lg text-left transition-colors {isCurrent ? 'bg-subtle border border-border text-text-primary' : isCompleted ? 'text-text-secondary' : 'text-text-muted opacity-75'}"
            >
              <div 
                class="w-5 h-5 rounded flex items-center justify-center text-xs font-mono shrink-0 mt-0.5 {isCompleted ? 'bg-emerald-600/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : isCurrent ? 'bg-brand text-white font-medium' : 'bg-subtle border border-border text-text-muted'}"
              >
                {#if isCompleted}
                  <Check class="w-3 h-3" />
                {:else}
                  <span>{step.id}</span>
                {/if}
              </div>

              <div class="leading-tight overflow-hidden">
                <div class="text-xs {isCurrent ? 'font-medium text-text-primary' : ''}">
                  {step.label}
                </div>
                <div class="text-[11px] text-text-muted truncate mt-0.5">
                  {step.desc}
                </div>
              </div>
            </div>
          {/each}
        </nav>
      </div>

      <div class="p-3 rounded-lg bg-subtle/40 border border-border text-xs text-text-muted space-y-1 mt-3">
        <div class="flex justify-between">
          <span>Mesin DB:</span>
          <span class="text-text-primary font-mono capitalize">{dbConfig.type}</span>
        </div>
        <div class="flex justify-between">
          <span>Port:</span>
          <span class="text-text-primary font-mono">{serverConfig.port || '-'}</span>
        </div>
      </div>
    </aside>

    <!-- Content Section Card (Fixed Height Container with Scrollable Body) -->
    <section class="flex-1 bg-surface border border-border rounded-lg flex flex-col min-h-0 overflow-hidden shadow-xs">
      <div class="flex-1 overflow-y-auto p-5 sm:p-6">
        {#if currentStep === 1}
          <StepWelcome />
        {:else if currentStep === 2}
          <StepServer
            bind:this={stepServerRef}
            bind:config={serverConfig}
            onNext={() => currentStep = 3}
          />
        {:else if currentStep === 3}
          <StepDbEngine
            bind:config={dbConfig}
          />
        {:else if currentStep === 4}
          <StepDbConfig
            bind:this={stepDbConfigRef}
            bind:config={dbConfig}
            bind:checkingDb
            onNext={() => currentStep = 5}
            onOldDbFound={handleOldDbFound}
          />
        {:else if currentStep === 5}
          <StepAdmin
            bind:this={stepAdminRef}
            bind:config={adminConfig}
            onNext={() => currentStep = 6}
          />
        {:else if currentStep === 6}
          <StepStore
            bind:config={storeConfig}
          />
        {:else if currentStep === 7}
          <StepInstall
            {serverConfig}
            {dbConfig}
            {adminConfig}
            {storeConfig}
            onBackToSettings={() => currentStep = 2}
          />
        {/if}
      </div>
    </section>
  </div>

  <!-- Fixed Footer with Navigation Buttons -->
  <footer class="fixed bottom-0 left-0 right-0 h-14 border-t border-border bg-surface/95 backdrop-blur-xs px-4 flex items-center justify-between z-20">
    <div class="max-w-5xl mx-auto w-full flex items-center justify-between gap-4">
      <!-- Back Button -->
      <div>
        {#if currentStep < 7}
          <button
            type="button"
            onclick={handleBack}
            disabled={currentStep === 1 || checkingDb}
            class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-border text-text-secondary text-xs font-medium transition-colors {currentStep === 1 || checkingDb ? 'opacity-40 cursor-not-allowed' : 'hover:bg-subtle hover:text-text-primary cursor-pointer'}"
          >
            <ArrowLeft class="w-4 h-4" />
            Kembali
          </button>
        {/if}
      </div>

      <!-- Center Info -->
      <div class="text-xs text-text-muted font-mono hidden sm:flex items-center">
        {#if currentStep <= steps.length}
          <span>Langkah {currentStep} dari {steps.length}</span>
        {/if}
      </div>

      <!-- Next / Action Button -->
      <div>
        {#if currentStep < 7}
          <button
            type="button"
            onclick={handleNext}
            disabled={checkingDb}
            class="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-brand hover:bg-brand-hover text-white text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
          >
            {#if checkingDb}
              <RefreshCw class="w-3.5 h-3.5 animate-spin" />
            {/if}
            {nextButtonLabel}
            {#if !checkingDb}
              <ArrowRight class="w-4 h-4" />
            {/if}
          </button>
        {/if}
      </div>
    </div>
  </footer>

  <!-- Old DB Migration Modal -->
  <MigrationModal
    open={migrationModalOpen}
    version={oldDbVersion}
    onSelect={handleMigrationChoice}
    onClose={() => migrationModalOpen = false}
  />
</div>

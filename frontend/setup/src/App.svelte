<script lang="ts">
  import { ArrowLeft, ArrowRight, ExternalLink, Moon, RefreshCw, Sun } from 'lucide-svelte';
  import { theme } from './theme.svelte';
  import type { StepId, ServerConfig, DatabaseConfig, AdminConfig, StoreConfig, StepController } from './types';
  
  import StepperRail from './components/StepperRail.svelte';
  import StepWelcome from './components/StepWelcome.svelte';
  import StepServer from './components/StepServer.svelte';
  import StepDbEngine from './components/StepDbEngine.svelte';
  import StepDbConfig from './components/StepDbConfig.svelte';
  import StepAdmin from './components/StepAdmin.svelte';
  import StepStore from './components/StepStore.svelte';
  import StepInstall from './components/StepInstall.svelte';
  import MigrationModal from './components/MigrationModal.svelte';

  let currentStep = $state<StepId>(1);

  let stepServerRef = $state<StepController>();
  let stepDbConfigRef = $state<StepController>();
  let stepAdminRef = $state<StepController>();
  let stepStoreRef = $state<StepController>();
  let checkingDb = $state(false);
  let checkingCert = $state(false);
  let installFinished = $state(false);
  let installRedirectUrl = $state('');

  let serverConfig = $state<ServerConfig>({
    protocol: 'http',
    port: 80,
    tls: {
      mode: 'generate',
    },
  });

  let dbConfig = $state<DatabaseConfig>({
    type: 'sqlite',
    host: 'localhost',
    port: 3306,
    name: 'kasirku',
    user: 'root',
    pass: ''
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
    store_phone_num: ''
  });

  let migrationModalOpen = $state(false);
  let oldDbVersion = $state<string | undefined>(undefined);

  function handleOldDbFound(version?: string) {
    oldDbVersion = version;
    migrationModalOpen = true;
  }

  function handleMigrationChoice(resetDb: boolean) {
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
      checkingCert = true;
      try {
        const ok = await stepServerRef?.proceed();
        if (ok) currentStep = 3;
      } finally {
        checkingCert = false;
      }
    } else if (currentStep === 3) {
      currentStep = 4;
    } else if (currentStep === 4) {
      checkingDb = true;
      try {
        const ok = await stepDbConfigRef?.proceed();
        if (ok) currentStep = 5;
      } finally {
        checkingDb = false;
      }
    } else if (currentStep === 5) {
      const ok = stepAdminRef?.proceed();
      if (ok) currentStep = 6;
    } else if (currentStep === 6) {
      const ok = stepStoreRef?.proceed() ?? true;
      if (ok) currentStep = 7;
    }
  }

  let nextButtonLabel = $derived.by(() => {
    if (checkingDb || checkingCert) return 'Memeriksa...';
    if (currentStep === 1) return 'Mulai Setup';
    if (currentStep === 6) return 'Mulai Instalasi';
    return 'Lanjut';
  });
</script>

<div class="h-screen flex flex-col bg-canvas text-ink overflow-hidden selection:bg-brand/20 selection:text-brand relative pb-16 antialiased">
  <!-- Top Navigation Header with larger title -->
  <header class="h-18 border-b border-line bg-surface shrink-0 px-6 sm:px-8">
    <div class="max-w-6xl mx-auto h-full flex items-center justify-between">
      <!-- KasirKu Branding -->
      <div class="flex items-center gap-3.5">
        <div class="w-10 h-10 rounded-xl border border-line p-2 flex items-center justify-center bg-subtle shrink-0 shadow-xs">
          <img src="/img/kasirku.png" alt="KasirKu Logo" class="w-full h-full object-contain" />
        </div>
        <div>
          <div class="font-bold text-lg sm:text-xl text-ink tracking-tight">KasirKu</div>
          <div class="text-xs sm:text-sm text-ink-muted">Installation Wizard</div>
        </div>
      </div>

      <!-- Right Controls: Theme Toggle -->
      <button
        type="button"
        onclick={() => theme.toggle()}
        aria-label={theme.isDark ? 'Ganti ke Mode Terang' : 'Ganti ke Mode Gelap'}
        title={theme.isDark ? 'Ganti ke Mode Terang' : 'Ganti ke Mode Gelap'}
        class="w-10 h-10 rounded-xl border border-line bg-surface hover:bg-subtle text-ink-muted hover:text-ink flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand/30"
      >
        {#if theme.isDark}
          <Sun class="w-5 h-5 text-warning" />
        {:else}
          <Moon class="w-5 h-5 text-ink-muted" />
        {/if}
      </button>
    </div>
  </header>

  <!-- Main Viewport Container -->
  <div class="flex-1 max-w-6xl mx-auto w-full px-6 sm:px-8 py-6 flex flex-col md:flex-row gap-6 min-h-0 overflow-hidden">
    <!-- Stepper Navigation Rail -->
    <StepperRail
      {currentStep}
      {serverConfig}
      {dbConfig}
      {adminConfig}
      {storeConfig}
    />

    <!-- Active Step Content Container -->
    <section class="flex-1 bg-surface border border-line rounded-2xl flex flex-col min-h-0 overflow-hidden shadow-xs">
      <div class="flex-1 overflow-y-auto p-6 sm:p-9">
        {#if currentStep === 1}
          <StepWelcome onStart={() => currentStep = 2} />
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
            bind:this={stepStoreRef}
            bind:config={storeConfig}
            onNext={() => currentStep = 7}
            onBack={() => currentStep = 5}
          />
        {:else if currentStep === 7}
          <StepInstall
            {serverConfig}
            {dbConfig}
            {adminConfig}
            {storeConfig}
            bind:isSuccess={installFinished}
            bind:redirectUrl={installRedirectUrl}
            onBackToSettings={() => currentStep = 2}
          />
        {/if}
      </div>
    </section>
  </div>

  <!-- Bottom Navigation Bar -->
  <footer class="fixed bottom-0 left-0 right-0 h-16 border-t border-line bg-surface/95 backdrop-blur-sm px-6 sm:px-8 flex items-center justify-between z-20">
    <div class="max-w-6xl mx-auto w-full relative flex items-center justify-between gap-4">
      <!-- Back Button -->
      <div class="flex items-center">
        {#if currentStep < 7}
          <button
            type="button"
            onclick={handleBack}
            disabled={currentStep === 1 || checkingDb || checkingCert}
            class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-line text-ink-muted text-sm font-medium transition-colors {currentStep === 1 || checkingDb || checkingCert ? 'opacity-30 cursor-not-allowed' : 'hover:bg-subtle hover:text-ink cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand/30'}"
          >
            <ArrowLeft class="w-4 h-4" />
            <span>Kembali</span>
          </button>
        {/if}
      </div>

      <!-- Center Progress Label (Locked to absolute center) -->
      <div class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-sm hidden sm:flex items-center pointer-events-none select-none">
        {#if currentStep <= 6}
          <span class="text-ink-faint">Langkah {currentStep} dari 6</span>
        {:else if installFinished}
          <span class="text-success font-semibold">Instalasi selesai</span>
        {:else}
          <span class="text-brand font-semibold">Proses Instalasi</span>
        {/if}
      </div>

      <!-- Next / Action Button -->
      <div class="flex items-center">
        {#if currentStep < 7}
          <button
            type="button"
            onclick={handleNext}
            disabled={checkingDb || checkingCert}
            class="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-brand hover:bg-brand-hover text-white text-sm font-medium transition-colors cursor-pointer disabled:opacity-50 shadow-xs focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand/30"
          >
            {#if checkingDb || checkingCert}
              <RefreshCw class="w-4 h-4 animate-spin" />
            {/if}
            <span>{nextButtonLabel}</span>
            {#if !checkingDb && !checkingCert}
              <ArrowRight class="w-4 h-4" />
            {/if}
          </button>
        {:else if installFinished && installRedirectUrl}
          <a
            href={installRedirectUrl}
            class="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-brand hover:bg-brand-hover text-white text-sm font-medium transition-colors cursor-pointer shadow-xs focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand/30"
          >
            <span>Buka KasirKu</span>
            <ExternalLink class="w-4 h-4" />
          </a>
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

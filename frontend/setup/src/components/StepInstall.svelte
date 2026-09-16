<script lang="ts">
  import { onMount } from 'svelte';
  import { 
    AlertCircle, 
    ArrowRight, 
    CheckCircle2, 
    RefreshCw, 
    ExternalLink, 
    Copy, 
    Check, 
    RotateCcw
  } from 'lucide-svelte';
  import type { ServerConfig, DatabaseConfig, AdminConfig, StoreConfig, InstallProgressState } from '../types';
  import { setupServer, setupDatabase, setupAdmin, setupStore, setupFinal, pollPing } from '../api';

  interface Props {
    serverConfig: ServerConfig;
    dbConfig: DatabaseConfig;
    adminConfig: AdminConfig;
    storeConfig: StoreConfig;
    onBackToSettings: () => void;
    isSuccess?: boolean;
    redirectUrl?: string;
  }

  let { 
    serverConfig, 
    dbConfig, 
    adminConfig, 
    storeConfig, 
    onBackToSettings,
    isSuccess = $bindable(false),
    redirectUrl = $bindable('')
  }: Props = $props();

  let state = $state<InstallProgressState>({
    currentStage: 'Menyiapkan proses instalasi...',
    percentage: 0,
    status: 'running',
  });

  interface StageItem {
    id: string;
    label: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
  }

  let stages = $state<StageItem[]>([
    { id: 'server', label: 'Konfigurasi protokol & port jaringan', status: 'pending' },
    { id: 'database', label: 'Inisialisasi & migrasi basis data', status: 'pending' },
    { id: 'admin', label: 'Pembuatan akun administrator utama', status: 'pending' },
    { id: 'store', label: 'Penyimpanan profil toko', status: 'pending' },
    { id: 'final', label: 'Finalisasi lingkungan & berkas konfigurasi', status: 'pending' },
    { id: 'verify', label: 'Verifikasi server utama', status: 'pending' },
  ]);

  let activeStageId = $state<string>('');
  let copiedUrl = $state(false);

  function updateStageStatus(stageId: string, status: 'pending' | 'running' | 'completed' | 'failed') {
    const idx = stages.findIndex(s => s.id === stageId);
    if (idx !== -1) {
      stages[idx].status = status;
    }
  }

  async function runInstallation() {
    state.status = 'running';
    state.errorMessage = undefined;
    isSuccess = false;
    redirectUrl = '';
    stages.forEach(s => s.status = 'pending');

    try {
      // 1. Setup Server
      activeStageId = 'server';
      updateStageStatus('server', 'running');
      state.currentStage = 'Menerapkan konfigurasi protokol dan port jaringan...';
      state.percentage = 15;
      await setupServer(serverConfig);
      updateStageStatus('server', 'completed');

      // 2. Setup Database
      activeStageId = 'database';
      updateStageStatus('database', 'running');
      state.currentStage = `Menghubungkan basis data ${dbConfig.type}...`;
      state.percentage = 35;
      await setupDatabase(dbConfig);
      updateStageStatus('database', 'completed');

      // 3. Setup Admin
      activeStageId = 'admin';
      updateStageStatus('admin', 'running');
      state.currentStage = 'Mendaftarkan akun administrator...';
      state.percentage = 55;
      await setupAdmin(adminConfig);
      updateStageStatus('admin', 'completed');

      // 4. Setup Store
      activeStageId = 'store';
      updateStageStatus('store', 'running');
      state.currentStage = 'Menyimpan profil toko...';
      state.percentage = 70;
      await setupStore(storeConfig);
      updateStageStatus('store', 'completed');

      // 5. Finalize setup
      activeStageId = 'final';
      updateStageStatus('final', 'running');
      state.currentStage = 'Menulis berkas konfigurasi .env dan memuat server utama...';
      state.percentage = 85;
      await setupFinal();
      updateStageStatus('final', 'completed');

      // 6. Ping server
      activeStageId = 'verify';
      updateStageStatus('verify', 'running');
      state.currentStage = 'Memverifikasi ketersediaan server utama...';
      state.percentage = 92;

      const hostname = window.location.hostname || 'localhost';
      const protocol = serverConfig.protocol;
      const port = serverConfig.port;
      const portPart = (protocol === 'http' && port === 80) || (protocol === 'https' && port === 443) ? '' : `:${port}`;
      const targetUrl = `http://${hostname}${portPart}`;
      state.redirectUrl = targetUrl;

      const isUp = await pollPing(targetUrl, 30, 1500);

      if (!isUp) {
        throw new Error(`Server utama tidak merespons pada ${targetUrl}/ping.`);
      }

      state.percentage = 100;
      state.status = 'success';
      updateStageStatus('verify', 'completed');
      state.currentStage = 'Instalasi selesai. Aplikasi siap digunakan.';
      isSuccess = true;
      redirectUrl = targetUrl;
    } catch (err: any) {
      if (activeStageId) {
        updateStageStatus(activeStageId, 'failed');
      }
      state.status = 'error';
      state.errorMessage = err.message || 'Terjadi kesalahan selama proses instalasi.';
      isSuccess = false;
      redirectUrl = '';
    }
  }

  async function copyLaunchUrl() {
    if (!state.redirectUrl) return;
    try {
      await navigator.clipboard.writeText(state.redirectUrl);
      copiedUrl = true;
      setTimeout(() => copiedUrl = false, 2500);
    } catch {
      // fallback
    }
  }

  onMount(() => {
    runInstallation();
  });
</script>

<div class="space-y-6 text-ink">
  <!-- Title Header -->
  <div class="space-y-1.5 border-b border-line pb-4">
    <h2 class="text-xl font-bold text-ink tracking-tight">
      {#if state.status === 'success'}
        Instalasi Selesai
      {:else if state.status === 'error'}
        Instalasi Gagal
      {:else}
        Menjalankan Instalasi
      {/if}
    </h2>
    <p class="text-sm text-ink-muted leading-relaxed">
      {#if state.status === 'success'}
        Aplikasi KasirKu telah berhasil dipasang dan server siap digunakan.
      {:else if state.status === 'error'}
        Terjadi kendala saat melakukan konfigurasi sistem.
      {:else}
        Mohon tunggu beberapa saat selagi sistem menyiapkan database dan server.
      {/if}
    </p>
  </div>

  <!-- Progress Bar Container -->
  <div class="p-6 rounded-2xl border border-line bg-surface space-y-3.5">
    <div class="flex justify-between items-center text-sm">
      <span class="text-ink font-semibold truncate">{state.currentStage}</span>
      <span class="text-ink-faint font-semibold tabular-nums shrink-0 ml-2">{state.percentage}%</span>
    </div>

    <!-- Progress Track & Bar -->
    <div class="w-full h-2.5 rounded-full bg-subtle overflow-hidden border border-line">
      <div
        class="h-full transition-all duration-300 {state.status === 'error' ? 'bg-danger' : state.status === 'success' ? 'bg-success' : 'bg-brand'}"
        style="width: {state.percentage}%"
      ></div>
    </div>
  </div>

  <!-- Stage Checklist -->
  <div class="rounded-2xl border border-line bg-surface overflow-hidden divide-y divide-line">
    {#each stages as stage}
      <div class="p-4 flex items-center justify-between gap-3.5 text-sm transition-colors {stage.status === 'running' ? 'bg-subtle/40' : stage.status === 'failed' ? 'bg-danger/5' : ''}">
        <div class="flex items-center gap-3.5">
          <!-- Icon -->
          <div class="shrink-0">
            {#if stage.status === 'completed'}
              <CheckCircle2 class="w-5 h-5 text-success" />
            {:else if stage.status === 'running'}
              <RefreshCw class="w-5 h-5 text-brand animate-spin" />
            {:else if stage.status === 'failed'}
              <AlertCircle class="w-5 h-5 text-danger" />
            {:else}
              <div class="w-5 h-5 rounded-full border border-line"></div>
            {/if}
          </div>

          <span class="{stage.status === 'running' ? 'font-semibold text-ink' : stage.status === 'completed' ? 'text-ink-muted font-medium' : stage.status === 'failed' ? 'text-danger font-semibold' : 'text-ink-faint'}">
            {stage.label}
          </span>
        </div>

        <!-- Status Text -->
        <div class="shrink-0 text-sm">
          {#if stage.status === 'completed'}
            <span class="text-success font-semibold">Selesai</span>
          {:else if stage.status === 'running'}
            <span class="text-brand font-semibold">Berjalan...</span>
          {:else if stage.status === 'failed'}
            <span class="text-danger font-semibold">Gagal</span>
          {:else}
            <span class="text-ink-faint">Menunggu</span>
          {/if}
        </div>
      </div>
    {/each}
  </div>

  <!-- Success Card -->
  {#if state.status === 'success'}
    <div class="p-6 rounded-2xl border border-success/30 bg-success/5 space-y-4">
      <div class="flex items-center gap-3.5">
        <div class="w-10 h-10 rounded-xl bg-success/15 text-success flex items-center justify-center shrink-0">
          <CheckCircle2 class="w-6 h-6" />
        </div>
        <div>
          <h3 class="text-base font-bold text-ink">KasirKu Siap Digunakan</h3>
          <p class="text-xs sm:text-sm text-ink-muted mt-0.5">
            Anda dapat langsung membuka aplikasi kasir melalui informasi dibawah.
          </p>
        </div>
      </div>

      <!-- Access Info -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm bg-surface p-4 rounded-xl border border-line">
        <div class="space-y-1">
          <span class="text-xs text-ink-faint">Username:</span>
          <span class="text-ink font-semibold block truncate">{adminConfig.username}</span>
        </div>
        <div class="space-y-1">
          <span class="text-xs text-ink-faint"> Password:</span>
          <span class="text-ink font-semibold block truncate">{adminConfig.password}</span>
        </div>
      </div>
    </div>
  {/if}

  <!-- Error Card -->
  {#if state.status === 'error'}
    <div class="p-6 rounded-2xl border border-danger/30 bg-danger/5 space-y-4">
      <div class="flex items-start gap-3.5">
        <AlertCircle class="w-6 h-6 text-danger shrink-0 mt-0.5" />
        <div class="space-y-1.5 flex-1">
          <div class="text-sm font-bold text-danger">
            Rincian Kesalahan:
          </div>
          <p class="text-sm text-danger leading-relaxed bg-surface p-3.5 rounded-xl border border-danger/20 font-mono">
            {state.errorMessage}
          </p>
        </div>
      </div>

      <div class="pt-2 border-t border-danger/20 flex items-center justify-between gap-3">
        <button
          type="button"
          onclick={onBackToSettings}
          class="px-4 py-2.5 text-sm font-medium rounded-xl border border-line bg-surface hover:bg-subtle text-ink transition-colors cursor-pointer"
        >
          Kembali ke Pengaturan
        </button>

        <button
          type="button"
          onclick={runInstallation}
          class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-danger hover:bg-danger/90 text-white text-sm font-medium transition-colors cursor-pointer shadow-xs"
        >
          <RotateCcw class="w-4 h-4" />
          <span>Ulangi Instalasi</span>
        </button>
      </div>
    </div>
  {/if}
</div>

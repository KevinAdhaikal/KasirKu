<script lang="ts">
  import { onMount } from 'svelte';
  import { AlertCircle, ArrowRight, CheckCircle2, RefreshCw } from 'lucide-svelte';
  import type { ServerConfig, DatabaseConfig, AdminConfig, StoreConfig, InstallProgressState } from '../types';
  import { setupServer, setupDatabase, setupAdmin, setupStore, setupFinal, pollPing } from '../api';

  interface Props {
    serverConfig: ServerConfig;
    dbConfig: DatabaseConfig;
    adminConfig: AdminConfig;
    storeConfig: StoreConfig;
    onBackToSettings: () => void;
  }

  let { serverConfig, dbConfig, adminConfig, storeConfig, onBackToSettings }: Props = $props();

  let state = $state<InstallProgressState>({
    currentStage: 'Menyiapkan konfigurasi...',
    percentage: 5,
    status: 'running',
  });

  let stages = $state([
    { id: 'server', label: 'Konfigurasi Jaringan & Port', status: 'pending' },
    { id: 'database', label: 'Inisialisasi & Migrasi Basis Data', status: 'pending' },
    { id: 'admin', label: 'Pembuatan Akun Administrator', status: 'pending' },
    { id: 'store', label: 'Penyimpanan Profil Toko', status: 'pending' },
    { id: 'final', label: 'Finalisasi Lingkungan & Booting Server', status: 'pending' },
    { id: 'verify', label: 'Verifikasi Server Aktif', status: 'pending' },
  ]);

  function updateStageStatus(stageId: string, status: 'pending' | 'running' | 'completed' | 'failed') {
    const idx = stages.findIndex(s => s.id === stageId);
    if (idx !== -1) {
      stages[idx].status = status;
    }
  }

  async function runInstallation() {
    state.status = 'running';
    state.errorMessage = undefined;

    try {
      // 1. Setup Server
      updateStageStatus('server', 'running');
      state.currentStage = 'Menerapkan konfigurasi protokol & port jaringan...';
      state.percentage = 15;
      await setupServer(serverConfig);
      updateStageStatus('server', 'completed');

      // 2. Setup Database
      updateStageStatus('database', 'running');
      state.currentStage = `Menghubungkan basis data ${dbConfig.type}...`;
      state.percentage = 35;
      await setupDatabase(dbConfig);
      updateStageStatus('database', 'completed');

      // 3. Setup Admin
      updateStageStatus('admin', 'running');
      state.currentStage = 'Mendaftarkan akun superadmin...';
      state.percentage = 55;
      await setupAdmin(adminConfig);
      updateStageStatus('admin', 'completed');

      // 4. Setup Store
      updateStageStatus('store', 'running');
      state.currentStage = 'Menyimpan profil toko...';
      state.percentage = 70;
      await setupStore(storeConfig);
      updateStageStatus('store', 'completed');

      // 5. Finalize setup
      updateStageStatus('final', 'running');
      state.currentStage = 'Menulis berkas .env dan beralih ke server utama...';
      state.percentage = 85;
      await setupFinal();
      updateStageStatus('final', 'completed');

      // 6. Ping server
      updateStageStatus('verify', 'running');
      state.currentStage = 'Memverifikasi ketersediaan server...';
      state.percentage = 95;

      const hostname = window.location.hostname || 'localhost';
      const protocol = serverConfig.protocol;
      const port = serverConfig.port;
      const portPart = (protocol === 'http' && port === 80) || (protocol === 'https' && port === 443) ? '' : `:${port}`;
      const targetUrl = `${protocol}://${hostname}${portPart}`;

      state.redirectUrl = targetUrl;

      // Poll ping
      await pollPing(targetUrl, 30, 1500);
      state.percentage = 100;
      state.status = 'success';
      updateStageStatus('verify', 'completed');
      state.currentStage = 'Instalasi selesai.';
    } catch (err: any) {
      state.status = 'error';
      state.errorMessage = err.message || 'Terjadi kesalahan selama proses instalasi.';
    }
  }

  onMount(() => {
    runInstallation();
  });
</script>

<div class="space-y-6">
  <!-- Status Header -->
  <div>
    {#if state.status === 'success'}
      <h2 class="text-lg font-medium text-text-primary">Instalasi Berhasil</h2>
      <p class="text-sm text-text-secondary mt-0.5">
        Aplikasi KasirKu telah berhasil dipasang dan siap digunakan.
      </p>
    {:else if state.status === 'error'}
      <h2 class="text-lg font-medium text-text-primary">Instalasi Gagal</h2>
      <p class="text-sm text-text-secondary mt-0.5">
        Terjadi kendala pada proses konfigurasi sistem.
      </p>
    {:else}
      <h2 class="text-lg font-medium text-text-primary">Menjalankan Instalasi</h2>
      <p class="text-sm text-text-secondary mt-0.5">
        Mohon tunggu beberapa saat selagi sistem menyiapkan database dan server.
      </p>
    {/if}
  </div>

  <!-- Progress Bar & Stage List -->
  <div class="p-4 rounded-lg bg-surface border border-border space-y-3">
    <div class="flex justify-between items-center text-xs">
      <span class="text-text-primary truncate">{state.currentStage}</span>
      <span class="font-mono text-text-muted tabular-nums">{state.percentage}%</span>
    </div>

    <!-- Progress Bar -->
    <div class="w-full h-1.5 rounded-full bg-subtle overflow-hidden border border-border">
      <div
        class="h-full transition-all duration-300 {state.status === 'error' ? 'bg-red-500' : state.status === 'success' ? 'bg-emerald-500' : 'bg-brand'}"
        style="width: {state.percentage}%"
      ></div>
    </div>

    <!-- Stage Checklist -->
    <div class="pt-3 border-t border-border space-y-2">
      {#each stages as stage}
        <div class="flex items-center justify-between text-xs py-0.5">
          <div class="flex items-center gap-2.5">
            {#if stage.status === 'completed'}
              <CheckCircle2 class="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            {:else if stage.status === 'running'}
              <RefreshCw class="w-4 h-4 text-brand animate-spin shrink-0" />
            {:else if stage.status === 'failed'}
              <AlertCircle class="w-4 h-4 text-red-500 shrink-0" />
            {:else}
              <div class="w-4 h-4 rounded-full border border-border shrink-0"></div>
            {/if}
            <span class="{stage.status === 'running' ? 'text-text-primary font-medium' : stage.status === 'completed' ? 'text-text-secondary' : 'text-text-muted'}">
              {stage.label}
            </span>
          </div>

          <span class="text-xs {stage.status === 'completed' ? 'text-emerald-600 dark:text-emerald-400' : stage.status === 'running' ? 'text-brand' : 'text-text-muted'}">
            {stage.status === 'completed' ? 'Selesai' : stage.status === 'running' ? 'Berjalan...' : 'Menunggu'}
          </span>
        </div>
      {/each}
    </div>
  </div>

  <!-- Success Card -->
  {#if state.status === 'success'}
    <div class="p-4 rounded-lg bg-subtle/50 border border-border space-y-3">
      <div class="text-xs text-text-secondary">
        Server utama telah aktif. Anda dapat langsung membuka aplikasi kasir melalui tautan di bawah:
      </div>

      <div class="text-xs space-y-1 bg-surface p-3 rounded border border-border font-mono">
        <div class="flex justify-between">
          <span class="text-text-muted">URL Akses:</span>
          <span class="text-text-primary font-medium">{state.redirectUrl}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-text-muted">Username Admin:</span>
          <span class="text-brand font-medium">{adminConfig.username}</span>
        </div>
      </div>

      <div class="pt-2 flex justify-end">
        <a
          href={state.redirectUrl}
          class="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand hover:bg-brand-hover text-white text-xs font-medium transition-colors cursor-pointer"
        >
          Buka KasirKu
          <ArrowRight class="w-4 h-4" />
        </a>
      </div>
    </div>
  {/if}

  <!-- Error Card -->
  {#if state.status === 'error'}
    <div class="p-4 rounded-lg bg-red-500/10 border border-red-500/20 space-y-3">
      <div class="flex items-start gap-2.5">
        <AlertCircle class="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
        <div>
          <div class="text-xs font-medium text-red-500">Rincian Kesalahan:</div>
          <p class="text-xs text-red-400 mt-0.5 leading-relaxed font-mono">
            {state.errorMessage}
          </p>
        </div>
      </div>

      <div class="pt-2 border-t border-red-500/20 flex items-center justify-between">
        <button
          type="button"
          onclick={onBackToSettings}
          class="px-3 py-1.5 rounded-lg border border-border hover:bg-subtle text-text-secondary hover:text-text-primary text-xs font-medium transition-colors cursor-pointer"
        >
          Kembali ke Pengaturan
        </button>

        <button
          type="button"
          onclick={runInstallation}
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-medium transition-colors cursor-pointer"
        >
          <RefreshCw class="w-3.5 h-3.5" />
          Ulangi
        </button>
      </div>
    </div>
  {/if}
</div>

<script lang="ts">
  import { ArrowLeft, ArrowRight, CheckCircle2, Eye, EyeOff, RefreshCw, AlertCircle } from 'lucide-svelte';
  import type { DatabaseConfig } from '../types';
  import { testDbConnection, checkOldDb } from '../api';

  interface Props {
    config: DatabaseConfig;
    onNext?: () => void;
    onBack?: () => void;
    onOldDbFound: (version?: string) => void;
    checkingDb?: boolean;
  }

  let { config = $bindable(), onNext, onBack, onOldDbFound, checkingDb = $bindable(false) }: Props = $props();

  let showPassword = $state(false);
  let testingConnection = $state(false);
  let connectionSuccess = $state(false);
  let connectionError = $state('');

  async function handleTestConnection() {
    testingConnection = true;
    connectionError = '';
    connectionSuccess = false;

    try {
      await testDbConnection(config);
      connectionSuccess = true;
    } catch (err: any) {
      connectionError = err.message || 'Gagal tersambung ke database. Periksa host, port, dan kredensial.';
    } finally {
      testingConnection = false;
    }
  }

  export async function proceed(): Promise<boolean> {
    if (config.type === 'sqlite') {
      if (!config.name.trim()) {
        connectionError = 'Nama berkas SQLite tidak boleh kosong.';
        return false;
      }
      onNext?.();
      return true;
    }

    if (!config.host.trim()) {
      connectionError = 'Alamat Host database wajib diisi.';
      return false;
    }
    if (!config.name.trim()) {
      connectionError = 'Nama database wajib diisi.';
      return false;
    }
    if (!config.user.trim()) {
      connectionError = 'Nama pengguna (User) database wajib diisi.';
      return false;
    }

    checkingDb = true;
    connectionError = '';

    try {
      const result = await checkOldDb(config);
      if (result.isOld) {
        onOldDbFound(result.version);
      } else {
        config.db_new_migrate = false;
        onNext?.();
      }
      return true;
    } catch (err: any) {
      connectionError = err.message || 'Koneksi ke database gagal saat memeriksa skema tabel.';
      return false;
    } finally {
      checkingDb = false;
    }
  }
</script>

<div class="space-y-6">
  <!-- Title -->
  <div class="flex items-center justify-between">
    <div>
      <h2 class="text-lg font-medium text-text-primary">
        {config.type === 'sqlite' ? 'Konfigurasi SQLite' : 'Koneksi ' + (config.type === 'mysql' ? 'MySQL' : 'PostgreSQL')}
      </h2>
      <p class="text-sm text-text-secondary mt-0.5">
        {config.type === 'sqlite' ? 'Tentukan nama berkas basis data lokal.' : 'Masukkan kredensial otentikasi basis data.'}
      </p>
    </div>
    <div class="w-9 h-9 rounded border border-border bg-subtle/40 p-1 shrink-0 flex items-center justify-center">
      {#if config.type === 'sqlite'}
        <img src="/img/sqlite.png" alt="SQLite" class="w-full h-full object-contain" />
      {:else if config.type === 'mysql'}
        <img src="/img/mysql.png" alt="MySQL" class="w-full h-full object-contain" />
      {:else}
        <img src="/img/postgresql.svg" alt="PostgreSQL" class="w-full h-full object-contain" />
      {/if}
    </div>
  </div>

  <!-- Form Fields -->
  {#if config.type === 'sqlite'}
    <div class="p-4 rounded-lg bg-surface border border-border space-y-3">
      <div>
        <label for="sqlite-file" class="block text-xs font-medium text-text-muted mb-1">
          Nama Berkas Basis Data <span class="text-red-500 font-medium">*</span>
        </label>
        <input
          id="sqlite-file"
          type="text"
          bind:value={config.name}
          placeholder="kasirku.db"
          class="w-full px-3 py-2 rounded-lg bg-surface border border-border text-sm text-text-primary focus:outline-hidden focus:border-brand focus:ring-1 focus:ring-brand/20 transition-colors"
        />
        <p class="text-xs text-text-muted mt-1.5">
          Berkas database ini akan disimpan di folder data lokal instalasi.
        </p>
      </div>
    </div>
  {:else}
    <div class="p-4 rounded-lg bg-surface border border-border space-y-4">
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <!-- Host -->
        <div class="sm:col-span-2">
          <label for="db-host" class="block text-xs font-medium text-text-muted mb-1">
            Host / Alamat Server <span class="text-red-500 font-medium">*</span>
          </label>
          <input
            id="db-host"
            type="text"
            bind:value={config.host}
            placeholder="localhost"
            class="w-full px-3 py-2 rounded-lg bg-surface border border-border text-sm text-text-primary focus:outline-hidden focus:border-brand focus:ring-1 focus:ring-brand/20 transition-colors"
          />
        </div>

        <!-- Port -->
        <div>
          <label for="db-port" class="block text-xs font-medium text-text-muted mb-1">
            Port <span class="text-red-500 font-medium">*</span>
          </label>
          <input
            id="db-port"
            type="number"
            bind:value={config.port}
            placeholder={config.type === 'mysql' ? '3306' : '5432'}
            class="w-full px-3 py-2 rounded-lg bg-surface border border-border text-sm font-mono text-text-primary focus:outline-hidden focus:border-brand focus:ring-1 focus:ring-brand/20 transition-colors tabular-nums"
          />
        </div>
      </div>

      <!-- DB Name -->
      <div>
        <label for="db-name" class="block text-xs font-medium text-text-muted mb-1">
          Nama Basis Data (Database Name) <span class="text-red-500 font-medium">*</span>
        </label>
        <input
          id="db-name"
          type="text"
          bind:value={config.name}
          placeholder="kasirku"
          class="w-full px-3 py-2 rounded-lg bg-surface border border-border text-sm text-text-primary focus:outline-hidden focus:border-brand focus:ring-1 focus:ring-brand/20 transition-colors"
        />
      </div>

      <!-- Credentials -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <!-- Username -->
        <div>
          <label for="db-user" class="block text-xs font-medium text-text-muted mb-1">
            Nama Pengguna (Username) <span class="text-red-500 font-medium">*</span>
          </label>
          <input
            id="db-user"
            type="text"
            bind:value={config.user}
            placeholder={config.type === 'mysql' ? 'root' : 'postgres'}
            class="w-full px-3 py-2 rounded-lg bg-surface border border-border text-sm text-text-primary focus:outline-hidden focus:border-brand focus:ring-1 focus:ring-brand/20 transition-colors"
          />
        </div>

        <!-- Password -->
        <div>
          <label for="db-pass" class="block text-xs font-medium text-text-muted mb-1">
            Kata Sandi (Password)
          </label>
          <div class="relative">
            <input
              id="db-pass"
              type={showPassword ? 'text' : 'password'}
              bind:value={config.pass}
              placeholder="••••••••"
              class="w-full px-3 py-2 pr-9 rounded-lg bg-surface border border-border text-sm text-text-primary focus:outline-hidden focus:border-brand focus:ring-1 focus:ring-brand/20 transition-colors"
            />
            <button
              type="button"
              onclick={() => showPassword = !showPassword}
              class="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary p-1 cursor-pointer"
            >
              {#if showPassword}
                <EyeOff class="w-4 h-4" />
              {:else}
                <Eye class="w-4 h-4" />
              {/if}
            </button>
          </div>
        </div>
      </div>

      <!-- Test Connection Button & Status -->
      <div class="pt-2 border-t border-border flex flex-wrap items-center justify-between gap-2">
        <div>
          {#if connectionSuccess}
            <span class="inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 class="w-4 h-4" /> Koneksi database berhasil
            </span>
          {:else if connectionError}
            <span class="inline-flex items-center gap-1.5 text-xs text-red-500">
              <AlertCircle class="w-4 h-4 shrink-0" /> {connectionError}
            </span>
          {/if}
        </div>

        <button
          type="button"
          onclick={handleTestConnection}
          disabled={testingConnection || !config.host || !config.name || !config.user}
          class="px-3 py-1.5 rounded-lg border border-border hover:bg-subtle text-xs text-text-primary transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed flex items-center gap-1.5 ml-auto"
        >
          <RefreshCw class="w-3.5 h-3.5 text-brand {testingConnection ? 'animate-spin' : ''}" />
          {testingConnection ? 'Menguji...' : 'Uji Koneksi'}
        </button>
      </div>
    </div>
  {/if}

</div>

<script lang="ts">
  import { 
    CheckCircle2, 
    AlertCircle, 
    RefreshCw, 
    Eye, 
    EyeOff
  } from 'lucide-svelte';
  import type { DatabaseConfig } from '../types';
  import { testDbConnection } from '../api';

  interface Props {
    config: DatabaseConfig;
    onNext?: () => void;
    onBack?: () => void;
    onOldDbFound: (version?: string) => void;
    checkingDb?: boolean;
  }

  let { 
    config = $bindable(), 
    onNext, 
    onBack, 
    onOldDbFound, 
    checkingDb = $bindable(false) 
  }: Props = $props();

  let showPassword = $state(false);
  let testingConnection = $state(false);
  let connectionSuccess = $state(false);
  let connectionError = $state('');
  let portError = $state('');
  let fieldErrors = $state<{ host?: string; name?: string; user?: string }>({});

  function resetConnectionStatus() {
    connectionSuccess = false;
    connectionError = '';
  }

  function handlePortKeyDown(e: KeyboardEvent) {
    const allowedKeys = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];
    if (allowedKeys.includes(e.key) || (e.ctrlKey || e.metaKey)) {
      return;
    }
    // Strictly block non-numeric characters (including 'e', '+', '-', '.')
    if (!/^\d$/.test(e.key)) {
      e.preventDefault();
    }
  }

  function handlePortInput(e: Event) {
    resetConnectionStatus();
    const target = e.target as HTMLInputElement;
    const sanitized = target.value.replace(/\D/g, '').slice(0, 5);
    target.value = sanitized;
    const num = Number(sanitized);

    if (!sanitized) {
      portError = 'Nomor port tidak boleh kosong.';
      config.port = 0;
    } else if (num < 1 || num > 65535) {
      portError = 'Port harus berada di rentang 1 – 65535.';
      config.port = num;
    } else {
      portError = '';
      config.port = num;
    }
  }

  async function handleTestConnection(): Promise<boolean> {
    fieldErrors = {};
    connectionError = '';
    connectionSuccess = false;

    let hasError = false;
    if (!config.host?.trim()) {
      fieldErrors.host = 'Host basis data wajib diisi.';
      hasError = true;
    }
    if (!config.port || config.port < 1 || config.port > 65535) {
      portError = 'Port harus berada di rentang 1 – 65535.';
      hasError = true;
    }
    if (!config.name?.trim()) {
      fieldErrors.name = 'Nama basis data wajib diisi.';
      hasError = true;
    } else if (!/^[a-zA-Z0-9_-]+$/.test(config.name.trim())) {
      fieldErrors.name = 'Nama database hanya boleh karakter alfanumerik, _ dan -.';
      hasError = true;
    }
    if (!config.user?.trim()) {
      fieldErrors.user = 'Nama pengguna (user) basis data wajib diisi.';
      hasError = true;
    } else if (!/^[a-zA-Z0-9_-]+$/.test(config.user.trim())) {
      fieldErrors.user = 'Nama pengguna hanya boleh karakter alfanumerik, _ dan -.';
      hasError = true;
    }

    if (hasError) return false;

    testingConnection = true;
    checkingDb = true;

    try {
      await testDbConnection(config);
      connectionSuccess = true;
      return true;
    } catch (err: any) {
      connectionError = err.message || 'Gagal tersambung ke database. Periksa host, port, dan kredensial autentikasi.';
      return false;
    } finally {
      testingConnection = false;
      checkingDb = false;
    }
  }

  export async function proceed(): Promise<boolean> {
    fieldErrors = {};
    connectionError = '';

    if (config.type === 'sqlite') {
      const trimmedName = (config.name || '').trim();
      if (!trimmedName) {
        fieldErrors.name = 'Nama berkas basis data SQLite wajib diisi.';
        return false;
      }
      if (!/^[a-zA-Z0-9_-]+$/.test(trimmedName)) {
        fieldErrors.name = 'Nama berkas hanya boleh huruf, angka, garis bawah (_), dan tanda hubung (-).';
        return false;
      }
      onNext?.();
      return true;
    }

    const ok = await handleTestConnection();
    if (!ok) {
      return false;
    }

    onNext?.();
    return true;
  }
</script>

<div class="space-y-6 text-ink">
  <!-- Title Header -->
  <div class="space-y-1.5 border-b border-line pb-4 flex items-center justify-between">
    <div>
      <h2 class="text-xl font-bold text-ink tracking-tight">
        {config.type === 'sqlite' ? 'Konfigurasi SQLite' : 'Koneksi ' + (config.type === 'mysql' ? 'MySQL' : 'PostgreSQL')}
      </h2>
      <p class="text-sm text-ink-muted leading-relaxed mt-0.5">
        {config.type === 'sqlite' 
          ? 'Tentukan nama berkas basis data lokal.' 
          : 'Masukkan alamat server, port, dan kredensial login database.'}
      </p>
    </div>

    <!-- Small Engine Icon -->
    <div class="w-10 h-10 rounded-xl border border-line bg-subtle p-2 flex items-center justify-center shrink-0 shadow-xs">
      {#if config.type === 'sqlite'}
        <img src="/img/sqlite.png" alt="SQLite" class="w-full h-full object-contain" />
      {:else if config.type === 'mysql'}
        <img src="/img/mysql.png" alt="MySQL" class="w-full h-full object-contain" />
      {:else}
        <img src="/img/postgresql.svg" alt="PostgreSQL" class="w-full h-full object-contain" />
      {/if}
    </div>
  </div>

  <!-- Form Fields: SQLite Mode -->
  {#if config.type === 'sqlite'}
    <div class="p-6 rounded-2xl border border-line bg-surface space-y-4">
      <div>
        <label for="sqlite-file" class="block text-sm font-semibold text-ink mb-2">
          Nama Berkas Basis Data <span class="text-danger">*</span>
        </label>
        <div class="relative flex items-center max-w-md">
          <input
            id="sqlite-file"
            type="text"
            bind:value={config.name}
            placeholder="kasirku"
            oninput={() => { fieldErrors.name = undefined; }}
            class="w-full px-4 py-2.5 pr-14 rounded-xl border text-sm text-ink transition-colors focus:outline-hidden focus:border-brand focus:ring-1 focus:ring-brand/30 {fieldErrors.name ? 'border-danger bg-danger/5 text-danger' : 'border-line bg-surface'}"
          />
          <span class="absolute right-4 text-sm text-ink-faint pointer-events-none select-none font-medium">
            .db
          </span>
        </div>
        {#if fieldErrors.name}
          <div class="flex items-center gap-1.5 text-xs sm:text-sm text-danger mt-1.5">
            <AlertCircle class="w-4 h-4 shrink-0" />
            <span>{fieldErrors.name}</span>
          </div>
        {:else}
          <p class="text-xs sm:text-sm text-ink-faint mt-1.5">
            Berkas database akan disimpan di folder <code class="text-ink px-1.5 py-0.5 rounded-md bg-subtle border border-line">database/</code> pada direktori instalasi.
          </p>
        {/if}
      </div>
    </div>
  {:else}
    <!-- Form Fields: MySQL / PostgreSQL Mode -->
    <div class="p-6 rounded-2xl border border-line bg-surface space-y-4">
      <!-- Host & Port Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <!-- Host -->
        <div class="sm:col-span-2">
          <label for="db-host" class="block text-sm font-semibold text-ink mb-2">
            Host / Alamat Server <span class="text-danger">*</span>
          </label>
          <input
            id="db-host"
            type="text"
            bind:value={config.host}
            placeholder="localhost atau 127.0.0.1"
            oninput={() => { fieldErrors.host = undefined; resetConnectionStatus(); }}
            class="w-full px-4 py-2.5 rounded-xl border text-sm text-ink transition-colors focus:outline-hidden focus:border-brand focus:ring-1 focus:ring-brand/30 {fieldErrors.host ? 'border-danger bg-danger/5 text-danger' : 'border-line bg-surface'}"
          />
          {#if fieldErrors.host}
            <div class="flex items-center gap-1.5 text-xs sm:text-sm text-danger mt-1.5">
              <AlertCircle class="w-4 h-4 shrink-0" />
              <span>{fieldErrors.host}</span>
            </div>
          {/if}
        </div>

        <!-- Port -->
        <div>
          <label for="db-port" class="block text-sm font-semibold text-ink mb-2">
            Port <span class="text-danger">*</span>
          </label>
          <input
            id="db-port"
            type="text"
            inputmode="numeric"
            pattern="[0-9]*"
            value={config.port}
            onkeydown={handlePortKeyDown}
            oninput={handlePortInput}
            placeholder={config.type === 'mysql' ? '3306' : '5432'}
            class="w-full px-4 py-2.5 rounded-xl border text-sm text-ink transition-colors focus:outline-hidden focus:border-brand focus:ring-1 focus:ring-brand/30 {portError ? 'border-danger bg-danger/5 text-danger' : 'border-line bg-surface'}"
          />
          {#if portError}
            <div class="flex items-center gap-1.5 text-xs sm:text-sm text-danger mt-1.5">
              <AlertCircle class="w-4 h-4 shrink-0" />
              <span>{portError}</span>
            </div>
          {/if}
        </div>
      </div>

      <!-- Database Name -->
      <div>
        <label for="db-name" class="block text-sm font-semibold text-ink mb-2">
          Nama Database <span class="text-danger">*</span>
        </label>
        <input
          id="db-name"
          type="text"
          bind:value={config.name}
          placeholder="kasirku"
          oninput={() => { fieldErrors.name = undefined; resetConnectionStatus(); }}
          class="w-full px-4 py-2.5 rounded-xl border text-sm text-ink transition-colors focus:outline-hidden focus:border-brand focus:ring-1 focus:ring-brand/30 {fieldErrors.name ? 'border-danger bg-danger/5 text-danger' : 'border-line bg-surface'}"
        />
        {#if fieldErrors.name}
          <div class="flex items-center gap-1.5 text-xs sm:text-sm text-danger mt-1.5">
            <AlertCircle class="w-4 h-4 shrink-0" />
            <span>{fieldErrors.name}</span>
          </div>
        {/if}
      </div>

      <!-- Credentials: User & Password -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <!-- Username -->
        <div>
          <label for="db-user" class="block text-sm font-semibold text-ink mb-2">
            Nama Pengguna (Username) <span class="text-danger">*</span>
          </label>
          <input
            id="db-user"
            type="text"
            bind:value={config.user}
            placeholder={config.type === 'mysql' ? 'root' : 'postgres'}
            oninput={() => { fieldErrors.user = undefined; resetConnectionStatus(); }}
            class="w-full px-4 py-2.5 rounded-xl border text-sm text-ink transition-colors focus:outline-hidden focus:border-brand focus:ring-1 focus:ring-brand/30 {fieldErrors.user ? 'border-danger bg-danger/5 text-danger' : 'border-line bg-surface'}"
          />
          {#if fieldErrors.user}
            <div class="flex items-center gap-1.5 text-xs sm:text-sm text-danger mt-1.5">
              <AlertCircle class="w-4 h-4 shrink-0" />
              <span>{fieldErrors.user}</span>
            </div>
          {/if}
        </div>

        <!-- Password -->
        <div>
          <label for="db-pass" class="block text-sm font-semibold text-ink mb-2">
            Kata Sandi (Password)
          </label>
          <div class="relative">
            <input
              id="db-pass"
              type={showPassword ? 'text' : 'password'}
              bind:value={config.pass}
              placeholder="Kata sandi database"
              oninput={() => { resetConnectionStatus(); }}
              class="w-full px-4 py-2.5 pr-12 rounded-xl border border-line bg-surface text-sm text-ink transition-colors focus:outline-hidden focus:border-brand focus:ring-1 focus:ring-brand/30"
            />
            <button
              type="button"
              onclick={() => showPassword = !showPassword}
              class="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink p-1 rounded-lg transition-colors cursor-pointer"
              title={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
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

      <!-- Test Connection Section -->
      <div class="pt-4 border-t border-line flex flex-wrap items-center justify-between gap-3">
        <div>
          {#if connectionSuccess}
            <span class="inline-flex items-center gap-2 text-sm text-success font-medium">
              <CheckCircle2 class="w-4 h-4 shrink-0" />
              Koneksi database berhasil terhubung
            </span>
          {:else if connectionError}
            <span class="inline-flex items-center gap-2 text-sm text-danger">
              <AlertCircle class="w-4 h-4 shrink-0" />
              <span>{connectionError}</span>
            </span>
          {/if}
        </div>

        <button
          type="button"
          onclick={handleTestConnection}
          disabled={testingConnection || checkingDb || !config.host || !config.name || !config.user}
          class="px-4 py-2 rounded-xl border border-line bg-surface hover:bg-subtle text-sm font-medium text-ink transition-colors disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed flex items-center gap-2 ml-auto shadow-xs"
        >
          <RefreshCw class="w-4 h-4 text-brand {testingConnection || checkingDb ? 'animate-spin' : ''}" />
          <span>{testingConnection || checkingDb ? 'Menguji...' : 'Uji Koneksi'}</span>
        </button>
      </div>
    </div>
  {/if}
</div>

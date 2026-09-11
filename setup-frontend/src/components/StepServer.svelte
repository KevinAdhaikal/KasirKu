<script lang="ts">
  import { ArrowLeft, ArrowRight, CheckCircle2, FileText, Globe, Key, ShieldCheck, AlertCircle } from 'lucide-svelte';
  import type { ServerConfig } from '../types';
  import { checkCertificate } from '../api';

  interface Props {
    config: ServerConfig;
    onNext: () => void;
    onBack: () => void;
  }

  let { config = $bindable(), onNext, onBack }: Props = $props();

  let certTesting = $state(false);
  let certValid = $state(false);
  let certError = $state('');
  let portError = $state('');

  function onProtocolChange(newProto: 'http' | 'https') {
    config.protocol = newProto;
    if (newProto === 'http' && config.port === 443) {
      config.port = 80;
    } else if (newProto === 'https' && config.port === 80) {
      config.port = 443;
    }
  }

  function handlePortKeyDown(e: KeyboardEvent) {
    // Allow navigation and edit keys
    const allowedKeys = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];
    if (allowedKeys.includes(e.key) || (e.ctrlKey || e.metaKey)) {
      return;
    }
    // Block non-numeric characters (including 'e', '+', '-', '.')
    if (!/^\d$/.test(e.key)) {
      e.preventDefault();
    }
  }

  function handlePortInput(e: Event) {
    const target = e.target as HTMLInputElement;
    const sanitized = target.value.replace(/\D/g, '').slice(0, 5);
    target.value = sanitized;
    const num = Number(sanitized);

    if (!sanitized) {
      portError = 'Port tidak boleh kosong.';
      config.port = 0;
    } else if (num < 1 || num > 65535) {
      portError = 'Port harus berada di antara 1 dan 65535.';
      config.port = num;
    } else {
      portError = '';
      config.port = num;
    }
  }

  async function handleFileUpload(e: Event, type: 'cert' | 'key') {
    const input = e.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    
    certValid = false;
    certError = '';

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1] || '';
      if (type === 'cert') {
        config.tls.cert = base64;
        config.tls.certFileName = file.name;
      } else {
        config.tls.key = base64;
        config.tls.keyFileName = file.name;
      }
    };
    reader.readAsDataURL(file);
  }

  async function verifyCertFiles() {
    if (!config.tls.cert || !config.tls.key) {
      certError = 'Harap unggah kedua berkas sertifikat (.crt) dan kunci pribadi (.key).';
      return;
    }

    certTesting = true;
    certError = '';
    certValid = false;

    try {
      await checkCertificate(config.tls.cert, config.tls.key);
      certValid = true;
    } catch (err: any) {
      certError = err.message || 'Sertifikat tidak valid atau pasangan kunci tidak cocok.';
    } finally {
      certTesting = false;
    }
  }

  function handleContinue(): boolean {
    if (!config.port || config.port < 1 || config.port > 65535) {
      portError = 'Port harus berupa angka valid antara 1 dan 65535.';
      return false;
    }

    if (config.protocol === 'https' && config.tls.mode === 'upload') {
      if (!config.tls.cert || !config.tls.key) {
        certError = 'Harap unggah sertifikat SSL dan kunci pribadi sebelum melanjutkan.';
        return false;
      }
      if (!certValid) {
        certError = 'Harap verifikasi sertifikat SSL terlebih dahulu.';
        return false;
      }
    }

    onNext?.();
    return true;
  }

  export function proceed(): boolean {
    return handleContinue();
  }
</script>

<div class="space-y-6">
  <!-- Title -->
  <div>
    <h2 class="text-lg font-medium text-text-primary">Konfigurasi Jaringan & Port</h2>
    <p class="text-sm text-text-secondary mt-0.5">
      Tentukan protokol komunikasi web dan port layanan yang digunakan oleh server KasirKu.
    </p>
  </div>

  <!-- Protocol Selector Cards -->
  <div class="space-y-2">
    <div class="text-xs font-medium text-text-muted">
      Protokol Server Web
    </div>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <!-- HTTP -->
      <button
        type="button"
        onclick={() => onProtocolChange('http')}
        class="p-4 rounded-lg border text-left transition-colors cursor-pointer flex items-start gap-3 {config.protocol === 'http' ? 'border-brand bg-brand/5' : 'border-border bg-surface hover:bg-subtle/50'}"
      >
        <div class="p-2 rounded {config.protocol === 'http' ? 'bg-brand/10 text-brand' : 'bg-subtle text-text-muted'} shrink-0">
          <Globe class="w-4 h-4" />
        </div>
        <div class="space-y-1">
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium text-text-primary">HTTP</span>
            {#if config.protocol === 'http'}
              <CheckCircle2 class="w-4 h-4 text-brand" />
            {/if}
          </div>
          <p class="text-xs text-text-secondary leading-normal">
            Cocok untuk jaringan lokal toko (LAN) atau jika diletakkan di belakang reverse proxy seperti Nginx.
          </p>
        </div>
      </button>

      <!-- HTTPS -->
      <button
        type="button"
        onclick={() => onProtocolChange('https')}
        class="p-4 rounded-lg border text-left transition-colors cursor-pointer flex items-start gap-3 {config.protocol === 'https' ? 'border-brand bg-brand/5' : 'border-border bg-surface hover:bg-subtle/50'}"
      >
        <div class="p-2 rounded {config.protocol === 'https' ? 'bg-brand/10 text-brand' : 'bg-subtle text-text-muted'} shrink-0">
          <ShieldCheck class="w-4 h-4" />
        </div>
        <div class="space-y-1">
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium text-text-primary">HTTPS</span>
            {#if config.protocol === 'https'}
              <CheckCircle2 class="w-4 h-4 text-brand" />
            {/if}
          </div>
          <p class="text-xs text-text-secondary leading-normal">
            Koneksi terenkripsi TLS/SSL. Direkomendasikan jika server diakses langsung melalui domain internet.
          </p>
        </div>
      </button>
    </div>
  </div>

  <!-- Port Configuration (Strictly Numeric) -->
  <div class="space-y-1.5">
    <div class="flex items-center justify-between">
      <label for="server-port" class="block text-xs font-medium text-text-muted">
        Port Layanan <span class="text-red-500 font-medium">*</span>
      </label>
      <span class="text-xs text-text-muted">Standar: {config.protocol === 'https' ? '443' : '80'}</span>
    </div>
    <div class="max-w-xs">
      <input
        id="server-port"
        type="text"
        inputmode="numeric"
        pattern="[0-9]*"
        value={config.port || ''}
        onkeydown={handlePortKeyDown}
        oninput={handlePortInput}
        class="w-full px-3 py-2 rounded-lg bg-surface border border-border text-sm font-mono text-text-primary focus:outline-hidden focus:border-brand focus:ring-1 focus:ring-brand/20 transition-colors tabular-nums"
        placeholder={config.protocol === 'https' ? '443' : '80'}
      />
    </div>
    {#if portError}
      <p class="text-xs text-red-500 flex items-center gap-1.5 mt-1">
        <AlertCircle class="w-3.5 h-3.5 shrink-0" />
        {portError}
      </p>
    {:else}
      <p class="text-xs text-text-muted">
        Nomor port TCP tempat aplikasi KasirKu akan melayani permintaan pengguna.
      </p>
    {/if}
  </div>

  <!-- HTTPS TLS Options -->
  {#if config.protocol === 'https'}
    <div class="p-4 rounded-lg bg-surface border border-border space-y-4">
      <div>
        <div class="text-xs font-medium text-text-primary">
          Metode Sertifikat SSL/TLS
        </div>
        <p class="text-xs text-text-secondary mt-0.5">
          Tentukan bagaimana sertifikat SSL disediakan.
        </p>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label class="flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors {config.tls.mode === 'generate' ? 'border-brand bg-brand/5' : 'border-border bg-subtle/40 hover:bg-subtle'}">
          <input
            type="radio"
            name="tls-mode"
            value="generate"
            checked={config.tls.mode === 'generate'}
            onchange={() => config.tls.mode = 'generate'}
            class="mt-1"
          />
          <div class="space-y-0.5">
            <span class="text-xs font-medium text-text-primary block">Buat Otomatis (Self-Signed)</span>
            <span class="text-xs text-text-secondary block">
              Sertifikat dibuat otomatis oleh server saat dijalankan.
            </span>
          </div>
        </label>

        <label class="flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors {config.tls.mode === 'upload' ? 'border-brand bg-brand/5' : 'border-border bg-subtle/40 hover:bg-subtle'}">
          <input
            type="radio"
            name="tls-mode"
            value="upload"
            checked={config.tls.mode === 'upload'}
            onchange={() => config.tls.mode = 'upload'}
            class="mt-1"
          />
          <div class="space-y-0.5">
            <span class="text-xs font-medium text-text-primary block">Unggah Berkas Mandiri</span>
            <span class="text-xs text-text-secondary block">
              Gunakan sertifikat milik domain Anda sendiri.
            </span>
          </div>
        </label>
      </div>

      {#if config.tls.mode === 'upload'}
        <div class="pt-3 border-t border-border space-y-3">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <!-- Cert File -->
            <div>
              <span class="block text-xs text-text-muted mb-1 flex items-center gap-1.5">
                <FileText class="w-3.5 h-3.5 text-text-secondary" /> Sertifikat (.crt / .pem) <span class="text-red-500 font-medium">*</span>
              </span>
              <label class="flex items-center justify-between px-3 py-2 rounded-lg border border-dashed border-border hover:border-brand bg-subtle/30 cursor-pointer text-xs transition-colors">
                <span class="truncate text-text-secondary max-w-[180px]">
                  {config.tls.certFileName || 'Pilih berkas sertifikat...'}
                </span>
                <span class="px-2 py-0.5 rounded bg-surface border border-border text-xs text-text-primary shrink-0">
                  Pilih
                </span>
                <input type="file" accept=".crt,.pem,.cer" class="hidden" onchange={(e) => handleFileUpload(e, 'cert')} />
              </label>
            </div>

            <!-- Key File -->
            <div>
              <span class="block text-xs text-text-muted mb-1 flex items-center gap-1.5">
                <Key class="w-3.5 h-3.5 text-text-secondary" /> Kunci Pribadi (.key) <span class="text-red-500 font-medium">*</span>
              </span>
              <label class="flex items-center justify-between px-3 py-2 rounded-lg border border-dashed border-border hover:border-brand bg-subtle/30 cursor-pointer text-xs transition-colors">
                <span class="truncate text-text-secondary max-w-[180px]">
                  {config.tls.keyFileName || 'Pilih berkas private key...'}
                </span>
                <span class="px-2 py-0.5 rounded bg-surface border border-border text-xs text-text-primary shrink-0">
                  Pilih
                </span>
                <input type="file" accept=".key,.pem" class="hidden" onchange={(e) => handleFileUpload(e, 'key')} />
              </label>
            </div>
          </div>

          <!-- Verification -->
          <div class="flex items-center justify-between pt-1">
            <div>
              {#if certValid}
                <span class="inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 class="w-4 h-4" /> Sertifikat valid
                </span>
              {:else if certError}
                <span class="inline-flex items-center gap-1.5 text-xs text-red-500">
                  <AlertCircle class="w-4 h-4 shrink-0" /> {certError}
                </span>
              {/if}
            </div>

            <button
              type="button"
              onclick={verifyCertFiles}
              disabled={certTesting || !config.tls.cert || !config.tls.key}
              class="px-3 py-1.5 rounded-lg border border-border hover:bg-subtle text-xs text-text-primary transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              <ShieldCheck class="w-3.5 h-3.5 text-brand" />
              {certTesting ? 'Memeriksa...' : 'Uji Validitas'}
            </button>
          </div>
        </div>
      {/if}
    </div>
  {/if}

</div>

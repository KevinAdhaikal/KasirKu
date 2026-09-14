<script lang="ts">
  import { 
    Globe, 
    ShieldCheck, 
    CheckCircle2, 
    AlertCircle, 
    FileText, 
    Key, 
    RefreshCw, 
    Upload, 
    Lock,
    Sparkles
  } from 'lucide-svelte';
  import type { ServerConfig } from '../types';
  import { checkCertificate } from '../api';

  interface Props {
    config: ServerConfig;
    onNext?: () => void;
    onBack?: () => void;
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
      portError = '';
    } else if (newProto === 'https' && config.port === 80) {
      config.port = 443;
      portError = '';
    }
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
        config.tls.certFileName = `${file.name} (${Math.round(file.size / 1024 * 10) / 10} KB)`;
      } else {
        config.tls.key = base64;
        config.tls.keyFileName = `${file.name} (${Math.round(file.size / 1024 * 10) / 10} KB)`;
      }
    };
    reader.readAsDataURL(file);
  }

  async function verifyCertFiles(): Promise<boolean> {
    if (!config.tls.cert || !config.tls.key) {
      certError = 'Harap unggah kedua berkas: sertifikat SSL (.crt/.pem) dan kunci privat (.key).';
      return false;
    }

    certTesting = true;
    certError = '';
    certValid = false;

    try {
      await checkCertificate(config.tls.cert, config.tls.key);
      certValid = true;
      return true;
    } catch (err: any) {
      certError = err.message || 'Sertifikat tidak valid atau pasangan kunci privat tidak cocok.';
      return false;
    } finally {
      certTesting = false;
    }
  }

  export async function proceed(): Promise<boolean> {
    if (!config.port || config.port < 1 || config.port > 65535) {
      portError = 'Port harus berupa angka valid antara 1 dan 65535.';
      return false;
    }

    if (config.protocol === 'https' && config.tls.mode === 'upload') {
      if (!config.tls.cert || !config.tls.key) {
        certError = 'Harap unggah berkas sertifikat SSL dan kunci privat sebelum melanjutkan.';
        return false;
      }
      if (!certValid) {
        const isValid = await verifyCertFiles();
        if (!isValid) return false;
      }
    }

    onNext?.();
    return true;
  }
</script>

<div class="space-y-6 text-ink">
  <!-- Title Header -->
  <div class="space-y-1.5 border-b border-line pb-4">
    <h2 class="text-xl font-bold text-ink tracking-tight">Konfigurasi Jaringan & Port</h2>
    <p class="text-sm text-ink-muted leading-relaxed">
      Tentukan protokol komunikasi web dan nomor port yang digunakan server KasirKu.
    </p>
  </div>

  <!-- Protocol Selector -->
  <div class="space-y-2.5">
    <div class="block text-sm font-semibold text-ink">
      Protokol Server
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
      <!-- HTTP Option -->
      <button
        type="button"
        onclick={() => onProtocolChange('http')}
        class="p-4 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3.5 select-none {config.protocol === 'http' ? 'border-brand bg-brand-soft/30 ring-1 ring-brand/30 shadow-xs' : 'border-line bg-surface hover:bg-subtle/50'}"
      >
        <div class="p-2.5 rounded-lg {config.protocol === 'http' ? 'bg-brand text-white' : 'bg-subtle text-ink-muted'} shrink-0 mt-0.5">
          <Globe class="w-5 h-5" />
        </div>
        <div class="space-y-1 flex-1">
          <div class="flex items-center justify-between">
            <span class="text-base font-semibold text-ink">HTTP</span>
            {#if config.protocol === 'http'}
              <CheckCircle2 class="w-5 h-5 text-brand shrink-0" />
            {/if}
          </div>
          <p class="text-xs sm:text-sm text-ink-muted leading-relaxed">
            Cocok jika KasirKu hanya digunakan di dalam toko dan tidak diakses dari internet.
          </p>
        </div>
      </button>

      <!-- HTTPS Option -->
      <button
        type="button"
        onclick={() => onProtocolChange('https')}
        class="p-4 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3.5 select-none {config.protocol === 'https' ? 'border-brand bg-brand-soft/30 ring-1 ring-brand/30 shadow-xs' : 'border-line bg-surface hover:bg-subtle/50'}"
      >
        <div class="p-2.5 rounded-lg {config.protocol === 'https' ? 'bg-brand text-white' : 'bg-subtle text-ink-muted'} shrink-0 mt-0.5">
          <ShieldCheck class="w-5 h-5" />
        </div>
        <div class="space-y-1 flex-1">
          <div class="flex items-center justify-between">
            <span class="text-base font-semibold text-ink">HTTPS</span>
            {#if config.protocol === 'https'}
              <CheckCircle2 class="w-5 h-5 text-brand shrink-0" />
            {/if}
          </div>
          <p class="text-xs sm:text-sm text-ink-muted leading-relaxed">
            Pilih ini jika KasirKu akan diakses melalui internet. Lebih aman untuk penggunaan jarak jauh.
          </p>
        </div>
      </button>
    </div>
  </div>

  <!-- Port Input Section -->
  <div class="space-y-2">
    <div class="flex items-center justify-between">
      <label for="server-port" class="block text-sm font-semibold text-ink">
        Port Server <span class="text-danger">*</span>
      </label>
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
        class="w-full px-4 py-2.5 rounded-xl bg-surface border {portError ? 'border-danger ring-1 ring-danger/30' : 'border-line focus:border-brand focus:ring-1 focus:ring-brand/30'} text-sm text-ink transition-colors focus:outline-hidden"
        placeholder={config.protocol === 'https' ? '443' : '80'}
      />
    </div>

    {#if portError}
      <p class="text-xs sm:text-sm text-danger flex items-center gap-1.5 mt-1">
        <AlertCircle class="w-4 h-4 shrink-0" />
        {portError}
      </p>
    {:else}
      <p class="text-xs sm:text-sm text-ink-faint">
        Nomor Port untuk Server aplikasi KasirKu.
      </p>
    {/if}
  </div>

  <!-- HTTPS TLS Certificate Configuration -->
  {#if config.protocol === 'https'}
    <div class="p-5 rounded-2xl bg-subtle/40 border border-line space-y-4">
      <div>
        <div class="text-sm font-semibold text-ink flex items-center gap-2">
          <Lock class="w-4 h-4 text-brand" />
          Metode Sertifikat SSL / TLS
        </div>
        <p class="text-xs sm:text-sm text-ink-muted mt-0.5">
          Pilih bagaimana sertifikat SSL disediakan untuk server.
        </p>
      </div>

      <!-- Mode Selector with Checkbox Card Style matching Protocol Selector -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <!-- Generate Option Card -->
        <button
          type="button"
          onclick={() => config.tls.mode = 'generate'}
          class="p-4 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3.5 select-none {config.tls.mode === 'generate' ? 'border-brand bg-brand-soft/30 ring-1 ring-brand/30 shadow-xs' : 'border-line bg-surface hover:bg-subtle'}"
        >
          <div class="p-2.5 rounded-lg {config.tls.mode === 'generate' ? 'bg-brand text-white' : 'bg-subtle text-ink-muted'} shrink-0 mt-0.5">
            <Sparkles class="w-5 h-5" />
          </div>
          <div class="space-y-1 flex-1">
            <div class="flex items-center justify-between">
              <span class="text-sm font-semibold text-ink">Buat Otomatis (Self-Signed)</span>
              {#if config.tls.mode === 'generate'}
                <CheckCircle2 class="w-5 h-5 text-brand shrink-0" />
              {/if}
            </div>
            <p class="text-xs sm:text-sm text-ink-muted leading-relaxed">
              Sertifikat dibuat otomatis oleh server saat proses instalasi.
            </p>
          </div>
        </button>

        <!-- Upload Option Card -->
        <button
          type="button"
          onclick={() => config.tls.mode = 'upload'}
          class="p-4 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3.5 select-none {config.tls.mode === 'upload' ? 'border-brand bg-brand-soft/30 ring-1 ring-brand/30 shadow-xs' : 'border-line bg-surface hover:bg-subtle'}"
        >
          <div class="p-2.5 rounded-lg {config.tls.mode === 'upload' ? 'bg-brand text-white' : 'bg-subtle text-ink-muted'} shrink-0 mt-0.5">
            <Upload class="w-5 h-5" />
          </div>
          <div class="space-y-1 flex-1">
            <div class="flex items-center justify-between">
              <span class="text-sm font-semibold text-ink">Gunakan Sertifikat Sendiri</span>
              {#if config.tls.mode === 'upload'}
                <CheckCircle2 class="w-5 h-5 text-brand shrink-0" />
              {/if}
            </div>
            <p class="text-xs sm:text-sm text-ink-muted leading-relaxed">
              Gunakan berkas sertifikat (.crt / .pem) dan kunci privat (.key) yang sudah Anda miliki.
            </p>
          </div>
        </button>
      </div>

      <!-- File Uploads for Custom Cert -->
      {#if config.tls.mode === 'upload'}
        <div class="pt-4 border-t border-line space-y-3.5">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <!-- Cert File -->
            <div class="space-y-1.5">
              <span class="text-sm font-medium text-ink flex items-center gap-1.5">
                <FileText class="w-4 h-4 text-brand" /> Sertifikat (.crt / .pem) <span class="text-danger">*</span>
              </span>
              <label class="flex items-center justify-between p-3 rounded-xl border border-line hover:border-brand bg-surface cursor-pointer transition-colors text-xs sm:text-sm">
                <span class="truncate text-ink max-w-[180px]">
                  {config.tls.certFileName || 'Pilih berkas sertifikat...'}
                </span>
                <span class="px-3 py-1 rounded-lg bg-subtle text-xs font-medium text-ink shrink-0 flex items-center gap-1.5">
                  <Upload class="w-3.5 h-3.5" /> Pilih
                </span>
                <input 
                  type="file" 
                  accept=".crt,.pem,.cer" 
                  class="hidden" 
                  onchange={(e) => handleFileUpload(e, 'cert')} 
                />
              </label>
            </div>

            <!-- Key File -->
            <div class="space-y-1.5">
              <span class="text-sm font-medium text-ink flex items-center gap-1.5">
                <Key class="w-4 h-4 text-brand" /> Kunci Privat (.key) <span class="text-danger">*</span>
              </span>
              <label class="flex items-center justify-between p-3 rounded-xl border border-line hover:border-brand bg-surface cursor-pointer transition-colors text-xs sm:text-sm">
                <span class="truncate text-ink max-w-[180px]">
                  {config.tls.keyFileName || 'Pilih berkas kunci privat...'}
                </span>
                <span class="px-3 py-1 rounded-lg bg-subtle text-xs font-medium text-ink shrink-0 flex items-center gap-1.5">
                  <Upload class="w-3.5 h-3.5" /> Pilih
                </span>
                <input 
                  type="file" 
                  accept=".key,.pem" 
                  class="hidden" 
                  onchange={(e) => handleFileUpload(e, 'key')} 
                />
              </label>
            </div>
          </div>

          <!-- Verification status & button -->
          <div class="pt-2 flex flex-wrap items-center justify-between gap-3">
            <div>
              {#if certValid}
                <span class="inline-flex items-center gap-2 text-sm text-success font-medium">
                  <CheckCircle2 class="w-4 h-4" /> Sertifikat valid
                </span>
              {:else if certError}
                <span class="inline-flex items-center gap-2 text-sm text-danger">
                  <AlertCircle class="w-4 h-4 shrink-0" /> {certError}
                </span>
              {/if}
            </div>

            <button
              type="button"
              onclick={verifyCertFiles}
              disabled={certTesting || !config.tls.cert || !config.tls.key}
              class="px-4 py-2 rounded-xl bg-surface border border-line hover:bg-subtle text-xs sm:text-sm text-ink font-medium transition-colors disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed flex items-center gap-2 ml-auto shadow-xs"
            >
              {#if certTesting}
                <RefreshCw class="w-4 h-4 animate-spin text-brand" />
                <span>Memeriksa...</span>
              {:else}
                <ShieldCheck class="w-4 h-4 text-brand" />
                <span>Uji Validitas Sertifikat</span>
              {/if}
            </button>
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>

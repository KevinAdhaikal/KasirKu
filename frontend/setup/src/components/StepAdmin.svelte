<script lang="ts">
  import { 
    Eye, 
    EyeOff, 
    AlertCircle
  } from 'lucide-svelte';
  import type { AdminConfig } from '../types';

  interface Props {
    config: AdminConfig;
    onNext?: () => void;
    onBack?: () => void;
  }

  let { config = $bindable(), onNext, onBack }: Props = $props();

  let showPass = $state(false);
  let showConfirmPass = $state(false);
  let fieldErrors = $state<{
    full_name?: string;
    username?: string;
    password?: string;
    confirm_password?: string;
  }>({});

  export function proceed(): boolean {
    fieldErrors = {};
    let hasError = false;

    // Full name check
    if (!config.full_name?.trim()) {
      fieldErrors.full_name = 'Nama lengkap pengelola wajib diisi.';
      hasError = true;
    }

    // Username check
    if (!config.username?.trim()) {
      fieldErrors.username = 'Nama pengguna (username) wajib diisi.';
      hasError = true;
    } else if (/\s/.test(config.username)) {
      fieldErrors.username = 'Username tidak boleh mengandung spasi.';
      hasError = true;
    } else if (config.username.trim().length < 3) {
      fieldErrors.username = 'Username minimal 3 karakter.';
      hasError = true;
    } else if (!/^[a-zA-Z0-9._-]+$/.test(config.username.trim())) {
      fieldErrors.username = 'Username hanya boleh berisi karakter alfanumerik, titik (.), strip (-), dan garis bawah (_).';
      hasError = true;
    }

    // Password check
    if (!config.password) {
      fieldErrors.password = 'Kata sandi wajib diisi.';
      hasError = true;
    } else if (config.password.length < 6) {
      fieldErrors.password = 'Kata sandi minimal 6 karakter demi keamanan.';
      hasError = true;
    }

    // Confirm password check
    if (!config.confirm_password) {
      fieldErrors.confirm_password = 'Harap konfirmasi kata sandi.';
      hasError = true;
    } else if (config.password !== config.confirm_password) {
      fieldErrors.confirm_password = 'Konfirmasi kata sandi tidak cocok dengan kata sandi.';
      hasError = true;
    }

    if (hasError) {
      return false;
    }

    onNext?.();
    return true;
  }
</script>

<div class="space-y-6 text-ink">
  <!-- Title Header -->
  <div class="space-y-1.5 border-b border-line pb-4">
    <h2 class="text-xl font-bold text-ink tracking-tight">Akun Administrator Utama</h2>
    <p class="text-sm text-ink-muted leading-relaxed">
      Akun ini digunakan untuk login sebagai pemilik / superadmin ke seluruh fitur KasirKu.
    </p>
  </div>

  <!-- Form Fields Panel -->
  <div class="p-6 rounded-2xl border border-line bg-surface space-y-4">
    <!-- Full Name -->
    <div>
      <label for="admin-fullname" class="block text-sm font-semibold text-ink mb-2">
        Nama Lengkap Pemilik / Pengelola <span class="text-danger">*</span>
      </label>
      <input
        id="admin-fullname"
        type="text"
        bind:value={config.full_name}
        placeholder="Contoh: Budi Santoso"
        oninput={() => { fieldErrors.full_name = undefined; }}
        class="w-full px-4 py-2.5 rounded-xl border text-sm text-ink transition-colors focus:outline-hidden focus:border-brand focus:ring-1 focus:ring-brand/30 {fieldErrors.full_name ? 'border-danger bg-danger/5 text-danger' : 'border-line bg-surface'}"
      />
      {#if fieldErrors.full_name}
        <div class="flex items-center gap-1.5 text-xs sm:text-sm text-danger mt-1.5">
          <AlertCircle class="w-4 h-4 shrink-0" />
          <span>{fieldErrors.full_name}</span>
        </div>
      {/if}
    </div>

    <!-- Username -->
    <div>
      <label for="admin-username" class="block text-sm font-semibold text-ink mb-2">
        Nama Pengguna (Username) <span class="text-danger">*</span>
      </label>
      <input
        id="admin-username"
        type="text"
        bind:value={config.username}
        placeholder="admin"
        autocomplete="username"
        oninput={() => { fieldErrors.username = undefined; }}
        class="w-full px-4 py-2.5 rounded-xl border text-sm text-ink transition-colors focus:outline-hidden focus:border-brand focus:ring-1 focus:ring-brand/30 {fieldErrors.username ? 'border-danger bg-danger/5 text-danger' : 'border-line bg-surface'}"
      />
      {#if fieldErrors.username}
        <div class="flex items-center gap-1.5 text-xs sm:text-sm text-danger mt-1.5">
          <AlertCircle class="w-4 h-4 shrink-0" />
          <span>{fieldErrors.username}</span>
        </div>
      {:else}
        <p class="text-xs sm:text-sm text-ink-faint mt-1.5">
          Minimal 3 karakter tanpa spasi.
        </p>
      {/if}
    </div>

    <!-- Passwords Grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-line">
      <!-- Password -->
      <div>
        <label for="admin-password" class="block text-sm font-semibold text-ink mb-2">
          Kata Sandi <span class="text-danger">*</span>
        </label>
        <div class="relative">
          <input
            id="admin-password"
            type={showPass ? 'text' : 'password'}
            bind:value={config.password}
            placeholder="Minimal 6 karakter"
            autocomplete="new-password"
            oninput={() => { fieldErrors.password = undefined; }}
            class="w-full px-4 py-2.5 pr-12 rounded-xl border text-sm text-ink transition-colors focus:outline-hidden focus:border-brand focus:ring-1 focus:ring-brand/30 {fieldErrors.password ? 'border-danger bg-danger/5 text-danger' : 'border-line bg-surface'}"
          />
          <button
            type="button"
            onclick={() => showPass = !showPass}
            class="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink p-1 rounded-lg transition-colors cursor-pointer"
            title={showPass ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
          >
            {#if showPass}
              <EyeOff class="w-4 h-4" />
            {:else}
              <Eye class="w-4 h-4" />
            {/if}
          </button>
        </div>
        {#if fieldErrors.password}
          <div class="flex items-center gap-1.5 text-xs sm:text-sm text-danger mt-1.5">
            <AlertCircle class="w-4 h-4 shrink-0" />
            <span>{fieldErrors.password}</span>
          </div>
        {/if}
      </div>

      <!-- Confirm Password -->
      <div>
        <label for="admin-confirm-password" class="block text-sm font-semibold text-ink mb-2">
          Konfirmasi Kata Sandi <span class="text-danger">*</span>
        </label>
        <div class="relative">
          <input
            id="admin-confirm-password"
            type={showConfirmPass ? 'text' : 'password'}
            bind:value={config.confirm_password}
            placeholder="Ketik ulang kata sandi"
            autocomplete="new-password"
            oninput={() => { fieldErrors.confirm_password = undefined; }}
            class="w-full px-4 py-2.5 pr-12 rounded-xl border text-sm text-ink transition-colors focus:outline-hidden focus:border-brand focus:ring-1 focus:ring-brand/30 {fieldErrors.confirm_password ? 'border-danger bg-danger/5 text-danger' : 'border-line bg-surface'}"
          />
          <button
            type="button"
            onclick={() => showConfirmPass = !showConfirmPass}
            class="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink p-1 rounded-lg transition-colors cursor-pointer"
            title={showConfirmPass ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
          >
            {#if showConfirmPass}
              <EyeOff class="w-4 h-4" />
            {:else}
              <Eye class="w-4 h-4" />
            {/if}
          </button>
        </div>
        {#if fieldErrors.confirm_password}
          <div class="flex items-center gap-1.5 text-xs sm:text-sm text-danger mt-1.5">
            <AlertCircle class="w-4 h-4 shrink-0" />
            <span>{fieldErrors.confirm_password}</span>
          </div>
        {/if}
      </div>
    </div>
  </div>
</div>

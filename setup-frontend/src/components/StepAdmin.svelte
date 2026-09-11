<script lang="ts">
  import { ArrowLeft, ArrowRight, Eye, EyeOff, AlertCircle } from 'lucide-svelte';
  import type { AdminConfig } from '../types';

  interface Props {
    config: AdminConfig;
    onNext?: () => void;
    onBack?: () => void;
  }

  let { config = $bindable(), onNext, onBack }: Props = $props();

  let showPass = $state(false);
  let showConfirmPass = $state(false);
  let validationError = $state('');

  function handleSubmit(): boolean {
    validationError = '';

    if (!config.full_name.trim()) {
      validationError = 'Nama lengkap pengelola wajib diisi.';
      return false;
    }
    if (!config.username.trim() || config.username.length < 3) {
      validationError = 'Username minimal 3 karakter tanpa spasi.';
      return false;
    }
    if (!config.password || config.password.length < 6) {
      validationError = 'Kata sandi minimal 6 karakter demi keamanan.';
      return false;
    }
    if (config.password !== config.confirm_password) {
      validationError = 'Konfirmasi kata sandi tidak cocok dengan kata sandi.';
      return false;
    }

    onNext?.();
    return true;
  }

  export function proceed(): boolean {
    return handleSubmit();
  }
</script>

<div class="space-y-6">
  <!-- Title -->
  <div>
    <h2 class="text-lg font-medium text-text-primary">Akun Administrator Utama</h2>
    <p class="text-sm text-text-secondary mt-0.5">
      Kredensial Superadmin untuk login ke dashboard manajemen toko dan kasir.
    </p>
  </div>

  <!-- Form Fields -->
  <div class="p-4 rounded-lg bg-surface border border-border space-y-4">
    <!-- Full Name -->
    <div>
      <label for="admin-fullname" class="block text-xs font-medium text-text-muted mb-1">
        Nama Lengkap Pemilik / Pengelola <span class="text-red-500 font-medium">*</span>
      </label>
      <input
        id="admin-fullname"
        type="text"
        bind:value={config.full_name}
        placeholder="Contoh: Budi Santoso"
        class="w-full px-3 py-2 rounded-lg bg-surface border border-border text-sm text-text-primary focus:outline-hidden focus:border-brand focus:ring-1 focus:ring-brand/20 transition-colors"
      />
    </div>

    <!-- Username -->
    <div>
      <label for="admin-username" class="block text-xs font-medium text-text-muted mb-1">
        Nama Pengguna (Username Login) <span class="text-red-500 font-medium">*</span>
      </label>
      <input
        id="admin-username"
        type="text"
        bind:value={config.username}
        placeholder="admin"
        autocomplete="username"
        class="w-full px-3 py-2 rounded-lg bg-surface border border-border text-sm text-text-primary focus:outline-hidden focus:border-brand focus:ring-1 focus:ring-brand/20 transition-colors"
      />
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <!-- Password -->
      <div>
        <label for="admin-password" class="block text-xs font-medium text-text-muted mb-1">
          Kata Sandi <span class="text-red-500 font-medium">*</span>
        </label>
        <div class="relative">
          <input
            id="admin-password"
            type={showPass ? 'text' : 'password'}
            bind:value={config.password}
            placeholder="Minimal 6 karakter"
            autocomplete="new-password"
            class="w-full px-3 py-2 pr-9 rounded-lg bg-surface border border-border text-sm text-text-primary focus:outline-hidden focus:border-brand focus:ring-1 focus:ring-brand/20 transition-colors"
          />
          <button
            type="button"
            onclick={() => showPass = !showPass}
            class="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary p-1 cursor-pointer"
          >
            {#if showPass}
              <EyeOff class="w-4 h-4" />
            {:else}
              <Eye class="w-4 h-4" />
            {/if}
          </button>
        </div>
      </div>

      <!-- Confirm Password -->
      <div>
        <label for="admin-confirm-password" class="block text-xs font-medium text-text-muted mb-1">
          Konfirmasi Kata Sandi <span class="text-red-500 font-medium">*</span>
        </label>
        <div class="relative">
          <input
            id="admin-confirm-password"
            type={showConfirmPass ? 'text' : 'password'}
            bind:value={config.confirm_password}
            placeholder="Ketik ulang kata sandi"
            autocomplete="new-password"
            class="w-full px-3 py-2 pr-9 rounded-lg bg-surface border border-border text-sm text-text-primary focus:outline-hidden focus:border-brand focus:ring-1 focus:ring-brand/20 transition-colors"
          />
          <button
            type="button"
            onclick={() => showConfirmPass = !showConfirmPass}
            class="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary p-1 cursor-pointer"
          >
            {#if showConfirmPass}
              <EyeOff class="w-4 h-4" />
            {:else}
              <Eye class="w-4 h-4" />
            {/if}
          </button>
        </div>
      </div>
    </div>

    {#if validationError}
      <div class="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-center gap-2">
        <AlertCircle class="w-3.5 h-3.5 shrink-0" />
        <span>{validationError}</span>
      </div>
    {/if}
  </div>

  <div class="p-3.5 rounded-lg bg-subtle/60 border border-border text-xs text-text-secondary">
    Kata sandi dienkripsi dengan standar hash industri sebelum disimpan di database. Anda dapat menambahkan staf kasir tambahan di menu pengaturan setelah instalasi selesai.
  </div>

</div>

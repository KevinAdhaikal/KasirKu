<svelte:head>
    <title>KasirKu | Login</title>
</svelte:head>

<script lang="ts">
  import { onMount } from 'svelte';
  import { auth } from '../stores/auth.svelte';
  import { router } from '../stores/router.svelte';
  import { toast } from '../stores/toast.svelte';
  import { sse } from '../stores/sse.svelte';
  import Button from '../components/ui/Button.svelte';
  import Input from '../components/ui/Input.svelte';
  import ThemeToggle from '../components/layout/ThemeToggle.svelte';
  import { User, Lock, Eye, EyeOff, AlertCircle } from 'lucide-svelte';

  let username = $state(typeof window !== 'undefined' ? localStorage.getItem('username') || '' : '');
  let password = $state('');
  let rememberMe = $state(true);
  let showPassword = $state(false);
  let loading = $state(false);
  let errorMessage = $state<string | null>(null);
  let usernameError = $state<string | null>(null);
  let passwordError = $state<string | null>(null);

  onMount(() => {
    // Otomatis fokus ke input username
    const usernameEl = document.getElementById('login-username') as HTMLInputElement | null;
    if (usernameEl) {
      usernameEl.focus();
      if (username) {
        usernameEl.select();
      }
    }
  });

  async function handleLogin() {
    errorMessage = null;
    usernameError = null;
    passwordError = null;

    let hasError = false;

    if (!username.trim()) {
      usernameError = 'Username wajib diisi.';
      hasError = true;
    }

    if (!password) {
      passwordError = 'Kata sandi wajib diisi.';
      hasError = true;
    }

    if (hasError) return;

    loading = true;
    try {
      await auth.login(username.trim(), password, rememberMe);
      sse.connect();
      router.navigate('/');
    } catch (err: any) {
      errorMessage = err.message || 'Gagal masuk ke sistem. Silakan periksa kredensial Anda.';
    } finally {
      loading = false;
    }
  }

  function handleUsernameKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!username.trim()) {
        usernameError = 'Username wajib diisi.';
        return;
      }
      const passEl = document.getElementById('login-password') as HTMLInputElement | null;
      passEl?.focus();
    }
  }

  function handlePasswordKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleLogin();
    }
  }
</script>

<div class="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)]">
  <div class="min-h-screen grid place-items-center p-5 sm:p-8 relative">
    <div class="absolute top-5 right-5">
      <ThemeToggle />
    </div>

    <div class="w-full max-w-[420px]">
      <div class="mb-6 sm:mb-7">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-[var(--bg-subtle)] flex items-center justify-center shadow-xs select-none overflow-hidden">
            <img src="/images/kasirku.png" alt="KasirKu" class="w-full h-full object-contain" />
          </div>
          <div>
            <p class="text-sm font-semibold tracking-tight">KasirKu</p>
            <p class="text-[11px] text-[var(--text-secondary)] mt-0.5">
              Simple & Efficient Point of Sale (PoS) System
            </p>
          </div>
        </div>
      </div>

      <div class="border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 sm:p-7 shadow-[0_8px_30px_var(--shadow-color)]">
        <div class="mb-6">
          <h1 class="text-lg font-semibold tracking-tight">Masuk ke KasirKu</h1>
          <p class="text-xs text-[var(--text-secondary)] mt-1">Masukkan kredensial akun untuk mengakses sistem.</p>
        </div>
      <form novalidate onsubmit={(e) => { e.preventDefault(); handleLogin(); }} class="space-y-4">
        {#if errorMessage}
          <div class="p-3 rounded-md border border-red-500/30 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 text-xs flex items-start gap-2.5">
            <AlertCircle class="w-4 h-4 shrink-0 mt-0.5" />
            <span class="leading-relaxed">{errorMessage}</span>
          </div>
        {/if}

        <div>
          <Input
            id="login-username"
            label="Username"
            bind:value={username}
            placeholder="Masukkan username Anda"
            autocomplete="username"
            autofocus
            required
            error={usernameError}
            oninput={() => {
              if (username.trim()) usernameError = null;
            }}
            onblur={() => {
              if (!username.trim()) usernameError = 'Username wajib diisi.';
            }}
            onkeydown={handleUsernameKeydown}
          >
            {#snippet prefix()}
              <User class="w-4 h-4" />
            {/snippet}
          </Input>
        </div>

        <div>
          <Input
            id="login-password"
            label="Kata Sandi"
            type={showPassword ? 'text' : 'password'}
            bind:value={password}
            placeholder="••••••••"
            autocomplete="current-password"
            required
            error={passwordError}
            oninput={() => {
              if (password) passwordError = null;
            }}
            onblur={() => {
              if (!password) passwordError = 'Kata sandi wajib diisi.';
            }}
            onkeydown={handlePasswordKeydown}
          >
            {#snippet prefix()}
              <Lock class="w-4 h-4" />
            {/snippet}
            {#snippet suffix()}
              <button
                type="button"
                onclick={() => (showPassword = !showPassword)}
                class="text-[var(--text-muted)] hover:text-[var(--text-primary)] focus:outline-none"
                aria-label={showPassword ? 'Sembunyikan sandi' : 'Tampilkan sandi'}
              >
                {#if showPassword}
                  <EyeOff class="w-4 h-4" />
                {:else}
                  <Eye class="w-4 h-4" />
                {/if}
              </button>
            {/snippet}
          </Input>
        </div>

        <div class="flex items-center justify-between text-xs pt-1">
          <label class="flex items-center gap-2 cursor-pointer select-none text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
            <input
              type="checkbox"
              bind:checked={rememberMe}
              class="rounded border-[var(--border-contrast)] text-[var(--accent-fg)] focus:ring-0 focus:ring-offset-0"
            />
            <span>Ingat username</span>
          </label>
        </div>

        <div class="pt-2">
          <Button
            type="submit"
            variant="primary"
            class="w-full h-11 font-semibold"
            {loading}
          >
            Masuk
          </Button>
        </div>
      </form>
    </div>
  </div>
</div>
</div>

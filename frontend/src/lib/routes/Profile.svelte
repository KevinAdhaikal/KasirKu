<svelte:head>
    <title>KasirKu | Profile</title>
</svelte:head>

<script lang="ts">
  import { auth } from '../stores/auth.svelte';
  import { api } from '../api/api';
  import { toast } from '../stores/toast.svelte';
  import Card from '../components/ui/Card.svelte';
  import Button from '../components/ui/Button.svelte';
  import Input from '../components/ui/Input.svelte';
  import Badge from '../components/ui/Badge.svelte';
  import { User, Shield, Lock, Save, KeyRound, AlertCircle, Upload, Eye, EyeOff } from 'lucide-svelte';

  import ImageCropperModal from '../components/ui/ImageCropperModal.svelte';

  // Profile edit state
  let fullName = $state(auth.user?.full_name || '');
  let username = $state(auth.user?.username || '');
  let savingProfile = $state(false);
  let profileImageBase64 = $state<string | null>(null);
  let profileImagePreview = $state<string | null>(auth.user?.profile_img || null);
  let rawImageSrc = $state<string>('');
  let cropperModalOpen = $state(false);
  let profileError = $state<string | null>(null);
  let fullNameError = $state<string | null>(null);
  let usernameError = $state<string | null>(null);

  // Password edit state
  let oldPassword = $state('');
  let newPassword = $state('');
  let confirmPassword = $state('');
  let savingPassword = $state(false);
  let passwordError = $state<string | null>(null);
  let oldPasswordError = $state<string | null>(null);
  let newPasswordError = $state<string | null>(null);
  let confirmPasswordError = $state<string | null>(null);
  let showOldPassword = $state(false);
  let showNewPassword = $state(false);
  let showConfirmPassword = $state(false);

  let profileInitialized = false;
  $effect(() => {
    if (auth.user && !profileInitialized) {
      fullName = auth.user.full_name || '';
      username = auth.user.username || '';
      if (!profileImagePreview) {
        profileImagePreview = auth.user.profile_img || null;
      }
      profileInitialized = true;
    }
  });

  async function handleUpdateProfile() {
    profileError = null;
    fullNameError = null;
    usernameError = null;

    let hasError = false;

    if (!fullName.trim()) {
      fullNameError = 'Nama lengkap wajib diisi.';
      hasError = true;
    }

    if (!username.trim()) {
      usernameError = 'Username wajib diisi.';
      hasError = true;
    } else if (!/^[a-z0-9_]+$/.test(username)) {
      usernameError = 'Username hanya boleh berisi huruf kecil, angka, dan underscore (_).';
      hasError = true;
    }

    if (hasError) return;

    savingProfile = true;
    try {
      const params = new URLSearchParams({
        new_full_name: fullName.trim(),
        new_username: username.trim(),
      });
      if (profileImageBase64) {
        params.append('new_profile_img', profileImageBase64);
      }
      await api.patch('/api/profile', params);

      await auth.fetchProfile();
      profileImagePreview = auth.user?.profile_img || profileImagePreview;
      profileImageBase64 = null;
      toast.success('Profil berhasil diperbarui.');
    } catch (err: any) {
      if (err.status === 403 || err.message === '1') {
        usernameError = 'Username tersebut telah digunakan oleh pengguna lain.';
      } else {
        profileError = err.message || 'Gagal memperbarui profil.';
      }
    } finally {
      savingProfile = false;
    }
  }

  function handleProfileImageChange(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    // Strict image validation
    if (!file.type || !file.type.startsWith('image/')) {
      alert('File yang dipilih bukan gambar! Hanya file gambar (JPG, PNG, WebP) yang diperbolehkan.');
      toast.error('File yang dipilih harus berupa gambar.');
      input.value = '';
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('Ukuran file foto terlalu besar! Maksimal 10 MB.');
      toast.error('Ukuran foto maksimal 10 MB.');
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      rawImageSrc = reader.result as string;
      cropperModalOpen = true;
      input.value = '';
    };
    reader.onerror = () => {
      toast.error('Gagal membaca file gambar.');
      input.value = '';
    };
    reader.readAsDataURL(file);
  }

  function handleCropComplete(result: { dataUrl: string; base64: string }) {
    profileImagePreview = result.dataUrl;
    profileImageBase64 = result.base64;
    toast.success('Foto profil siap. Klik "Simpan Perubahan" untuk menyimpan ke akun Anda.');
  }

  async function handleChangePassword() {
    passwordError = null;
    oldPasswordError = null;
    newPasswordError = null;
    confirmPasswordError = null;

    let hasError = false;

    if (!oldPassword) {
      oldPasswordError = 'Kata sandi saat ini wajib diisi.';
      hasError = true;
    }

    if (!newPassword) {
      newPasswordError = 'Kata sandi baru wajib diisi.';
      hasError = true;
    } else if (newPassword.length < 8) {
      newPasswordError = 'Kata sandi baru minimal harus 8 karakter.';
      hasError = true;
    }

    if (!confirmPassword) {
      confirmPasswordError = 'Konfirmasi kata sandi baru wajib diisi.';
      hasError = true;
    } else if (newPassword !== confirmPassword) {
      confirmPasswordError = 'Konfirmasi kata sandi baru tidak cocok.';
      hasError = true;
    }

    if (hasError) return;

    savingPassword = true;
    try {
      const params = new URLSearchParams({
        old_pass: oldPassword,
        new_pass: newPassword,
      });

      const newToken = await api.patch<string>('/api/change_password', params);
      if (newToken) {
        auth.token = newToken;
        localStorage.setItem('token', newToken);
      }

      oldPassword = '';
      newPassword = '';
      confirmPassword = '';
      toast.success('Kata sandi berhasil diperbarui.');
    } catch (err: any) {
      if (err.status === 403 || err.message === '0') {
        passwordError = 'Kata sandi saat ini salah.';
      } else {
        passwordError = err.message || 'Gagal mengubah kata sandi.';
      }
    } finally {
      savingPassword = false;
    }
  }
</script>

<div class="space-y-6 max-w-4xl mx-auto">
  <!-- Header -->
  <div class="border-b border-neutral-200/80 dark:border-neutral-800 pb-4">
    <h1 class="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
      Profil Pengguna
    </h1>
    <p class="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
      Kelola informasi akun Anda dan keamanan kredensial login.
    </p>
  </div>

  <div class="flex flex-col space-y-6 max-w-3xl">
    <!-- Card 1: Informasi Profil -->
    <Card
      title="Informasi Pribadi"
      description="Perbarui nama lengkap dan username akun"
    >
      <form novalidate onsubmit={(e) => { e.preventDefault(); handleUpdateProfile(); }} class="space-y-4">
        {#if profileError}
          <div class="p-3 rounded-md border border-red-500/30 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 text-xs flex items-start gap-2">
            <AlertCircle class="w-4 h-4 shrink-0 mt-0.5" />
            <span>{profileError}</span>
          </div>
        {/if}

        <div class="flex items-center justify-between gap-4 p-3 rounded-lg border border-neutral-200/80 dark:border-neutral-800 bg-[var(--bg-subtle)]/60">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-12 h-12 rounded-full overflow-hidden bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center font-bold text-sm text-neutral-700 dark:text-neutral-300 shrink-0 border border-neutral-200 dark:border-neutral-700">
              {#if profileImagePreview}
                <img src={profileImagePreview} alt="Foto profil" class="w-full h-full object-cover" />
              {:else}
                {auth.user?.full_name?.charAt(0) || 'U'}
              {/if}
            </div>
            <div class="min-w-0">
              <p class="text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate">{auth.user?.full_name}</p>
              <div class="flex items-center gap-2 mt-0.5">
                <span class="text-[11px] text-neutral-500 font-mono truncate">@{auth.user?.username}</span>
                <Badge variant="neutral">{auth.user?.role_name || 'Staff'}</Badge>
              </div>
            </div>
          </div>

          <label class="inline-flex items-center gap-2 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-200 hover:bg-[var(--bg-hover)] cursor-pointer transition-colors shrink-0">
            <Upload class="w-3.5 h-3.5" />
            <span class="hidden sm:inline">Upload Foto</span>
            <span class="sm:hidden">Upload</span>
            <input type="file" accept="image/*" class="hidden" onchange={handleProfileImageChange} />
          </label>
        </div>

        <Input
          id="profile-name"
          label="Nama Lengkap"
          bind:value={fullName}
          placeholder="Nama Lengkap"
          required
          error={fullNameError}
          oninput={() => {
            if (fullName.trim()) fullNameError = null;
          }}
          onblur={() => {
            if (!fullName.trim()) fullNameError = 'Nama lengkap wajib diisi.';
          }}
        >
          {#snippet prefix()}
            <User class="w-4 h-4" />
          {/snippet}
        </Input>

        <Input
          id="profile-username"
          label="Username"
          bind:value={username}
          placeholder="username"
          hint="Huruf kecil, angka, dan underscore saja."
          required
          error={usernameError}
          oninput={() => {
            if (username.trim()) usernameError = null;
          }}
          onblur={() => {
            if (!username.trim()) {
              usernameError = 'Username wajib diisi.';
            } else if (!/^[a-z0-9_]+$/.test(username)) {
              usernameError = 'Username hanya boleh berisi huruf kecil, angka, dan underscore (_).';
            }
          }}
        >
          {#snippet prefix()}
            <span class="font-mono text-xs">@</span>
          {/snippet}
        </Input>

        <div class="pt-2">
          <Button type="submit" variant="primary" size="sm" loading={savingProfile}>
            <Save class="w-3.5 h-3.5" />
            <span>Simpan Perubahan</span>
          </Button>
        </div>
      </form>
    </Card>

    <!-- Card 2: Ubah Kata Sandi -->
    <Card
      title="Ubah Kata Sandi"
      description="Pastikan menggunakan kata sandi yang aman dan tidak mudah ditebak"
    >
      <form novalidate onsubmit={(e) => { e.preventDefault(); handleChangePassword(); }} class="space-y-4">
        {#if passwordError}
          <div class="p-3 rounded-md border border-red-500/30 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 text-xs flex items-start gap-2">
            <AlertCircle class="w-4 h-4 shrink-0 mt-0.5" />
            <span>{passwordError}</span>
          </div>
        {/if}

        <Input
          id="old-password"
          label="Kata Sandi Saat Ini"
          type={showOldPassword ? 'text' : 'password'}
          bind:value={oldPassword}
          placeholder="••••••••"
          required
          error={oldPasswordError}
          oninput={() => {
            if (oldPassword) oldPasswordError = null;
          }}
          onblur={() => {
            if (!oldPassword) oldPasswordError = 'Kata sandi saat ini wajib diisi.';
          }}
        >
          {#snippet prefix()}
            <KeyRound class="w-4 h-4" />
          {/snippet}
          {#snippet suffix()}
            <button type="button" class="pointer-events-auto text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200" onclick={() => (showOldPassword = !showOldPassword)} aria-label={showOldPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}>
              {#if showOldPassword}<EyeOff class="w-4 h-4" />{:else}<Eye class="w-4 h-4" />{/if}
            </button>
          {/snippet}
        </Input>

        <Input
          id="new-password"
          label="Kata Sandi Baru"
          type={showNewPassword ? 'text' : 'password'}
          bind:value={newPassword}
          placeholder="Minimal 8 karakter"
          required
          error={newPasswordError}
          oninput={() => {
            if (newPassword) newPasswordError = null;
          }}
          onblur={() => {
            if (!newPassword) newPasswordError = 'Kata sandi baru wajib diisi.';
            else if (newPassword.length < 8) newPasswordError = 'Kata sandi baru minimal harus 8 karakter.';
          }}
        >
          {#snippet prefix()}
            <Lock class="w-4 h-4" />
          {/snippet}
          {#snippet suffix()}
            <button type="button" class="pointer-events-auto text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200" onclick={() => (showNewPassword = !showNewPassword)} aria-label={showNewPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}>
              {#if showNewPassword}<EyeOff class="w-4 h-4" />{:else}<Eye class="w-4 h-4" />{/if}
            </button>
          {/snippet}
        </Input>

        <Input
          id="confirm-password"
          label="Ulangi Kata Sandi Baru"
          type={showConfirmPassword ? 'text' : 'password'}
          bind:value={confirmPassword}
          placeholder="Ulangi kata sandi baru"
          required
          error={confirmPasswordError}
          oninput={() => {
            if (confirmPassword) confirmPasswordError = null;
          }}
          onblur={() => {
            if (!confirmPassword) confirmPasswordError = 'Konfirmasi kata sandi baru wajib diisi.';
            else if (newPassword && confirmPassword !== newPassword) confirmPasswordError = 'Konfirmasi kata sandi baru tidak cocok.';
          }}
        >
          {#snippet prefix()}
            <Lock class="w-4 h-4" />
          {/snippet}
          {#snippet suffix()}
            <button type="button" class="pointer-events-auto text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200" onclick={() => (showConfirmPassword = !showConfirmPassword)} aria-label={showConfirmPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}>
              {#if showConfirmPassword}<EyeOff class="w-4 h-4" />{:else}<Eye class="w-4 h-4" />{/if}
            </button>
          {/snippet}
        </Input>

        <div class="pt-2">
          <Button type="submit" variant="secondary" size="sm" loading={savingPassword}>
            <Shield class="w-3.5 h-3.5" />
            <span>Perbarui Kata Sandi</span>
          </Button>
        </div>
      </form>
    </Card>
  </div>
</div>

<!-- Avatar Image Cropper Modal (Discord-style) -->
<ImageCropperModal
  bind:open={cropperModalOpen}
  imageSrc={rawImageSrc}
  oncrop={handleCropComplete}
  onclose={() => {
    cropperModalOpen = false;
  }}
/>


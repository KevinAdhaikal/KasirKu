<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { auth, Permissions } from './lib/stores/auth.svelte';
  import { router } from './lib/stores/router.svelte';
  import { sse } from './lib/stores/sse.svelte';
  import { progress } from './lib/stores/progress.svelte';
  import { toast } from './lib/stores/toast.svelte';
  import AppLayout from './lib/components/layout/AppLayout.svelte';
  import ProgressBar from './lib/components/ui/ProgressBar.svelte';
  import ToastContainer from './lib/components/ui/ToastContainer.svelte';
  import ConfirmDialog from './lib/components/ui/ConfirmDialog.svelte';

  // Routes
  import Login from './lib/routes/Login.svelte';
  import Dashboard from './lib/routes/Dashboard.svelte';
  import Profile from './lib/routes/Profile.svelte';
  import Kasir from './lib/routes/Kasir.svelte';
  import DaftarBarang from './lib/routes/barang/DaftarBarang.svelte';
  import KategoriBarang from './lib/routes/barang/KategoriBarang.svelte';
  import BarangMasuk from './lib/routes/barang/BarangMasuk.svelte';
  import ReturBarang from './lib/routes/barang/ReturBarang.svelte';
  import Penjualan from './lib/routes/pembukuan/Penjualan.svelte';
  import Pengeluaran from './lib/routes/pembukuan/Pengeluaran.svelte';
  import Laporan from './lib/routes/pembukuan/Laporan.svelte';
  import Users from './lib/routes/admin/Users.svelte';
  import Roles from './lib/routes/admin/Roles.svelte';
  import Settings from './lib/routes/admin/Settings.svelte';

  onMount(async () => {
    try {
      await auth.init();

      if (auth.isAuthenticated) {
        await sse.connect();
        if (router.currentPath === '/login') {
          router.navigate(auth.getDefaultAvailablePath(), true);
        } else if (!auth.isPathAllowed(router.currentPath)) {
          router.navigate(auth.getDefaultAvailablePath(), true);
        }
      } else {
        if (router.currentPath !== '/login') {
          router.navigate('/login', true);
        }
      }
    } catch {
      if (router.currentPath !== '/login') {
        router.navigate('/login', true);
      }
    }
  });

  // Watch route & authentication strictly with real-time permission enforcement
  $effect(() => {
    const isAuth = auth.isAuthenticated;
    const isInit = auth.isInitialized;
    const user = auth.user;
    const currentPath = router.currentPath;

    if (isInit) {
      untrack(() => {
        if (!isAuth) {
          sse.disconnect();
          if (currentPath !== '/login') {
            router.navigate('/login', true);
          }
        } else if (user && !auth.isPathAllowed(currentPath)) {
          const fallback = auth.getDefaultAvailablePath();
          toast.warning('Akses ke menu tersebut telah dinonaktifkan oleh Administrator.');
          if (currentPath !== fallback) {
            router.navigate(fallback, true);
          }
        }
      });
    }
  });
</script>

{#if !auth.isInitialized}
  <!-- Blank screen with theme canvas background while verifying session token and credentials -->
  <div class="min-h-screen w-full bg-[var(--bg-canvas)]" aria-hidden="true"></div>
{:else}
  <ProgressBar />

  {#if !auth.isAuthenticated}
    <Login />
  {:else}
    <AppLayout>
      {#if (router.currentPath === '/' || router.currentPath === '/dashboard') && auth.can(Permissions.DASHBOARD)}
        <Dashboard />
      {:else if router.currentPath === '/profile'}
        <Profile />
      {:else if router.currentPath === '/kasir' && auth.can(Permissions.KASIR)}
        <Kasir />
      {:else if router.currentPath === '/barang/daftar_barang' && auth.can(Permissions.MANAGE_BARANG)}
        <DaftarBarang />
      {:else if router.currentPath === '/barang/kategori_barang' && auth.can(Permissions.MANAGE_BARANG)}
        <KategoriBarang />
      {:else if router.currentPath === '/barang/barang_masuk' && auth.can(Permissions.MANAGE_BARANG)}
        <BarangMasuk />
      {:else if router.currentPath === '/barang/retur_barang' && auth.can(Permissions.MANAGE_BARANG)}
        <ReturBarang />
      {:else if (router.currentPath === '/pembukuan/penjualan' || router.currentPath === '/penjualan') && auth.can(Permissions.MANAGE_PEMBUKUAN)}
        <Penjualan />
      {:else if (router.currentPath === '/pembukuan/pengeluaran' || router.currentPath === '/pengeluaran') && auth.can(Permissions.MANAGE_PEMBUKUAN)}
        <Pengeluaran />
      {:else if (router.currentPath === '/pembukuan/laporan' || router.currentPath === '/laporan') && auth.can(Permissions.MANAGE_PEMBUKUAN)}
        <Laporan />
      {:else if router.currentPath === '/users' && auth.can(Permissions.ADMINISTRATOR)}
        <Users />
      {:else if router.currentPath === '/rp' && auth.can(Permissions.ADMINISTRATOR)}
        <Roles />
      {:else if router.currentPath === '/settings' && auth.can(Permissions.ADMINISTRATOR)}
        <Settings />
      {:else if !auth.isPathAllowed(router.currentPath)}
        <div class="py-16 text-center">
          <div class="inline-flex p-3 rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 mb-3">
            <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 class="text-xl font-bold text-neutral-900 dark:text-neutral-100">Akses Tidak Diizinkan</h2>
          <p class="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">Anda tidak memiliki izin untuk mengakses menu ini. Anda sedang dialihkan...</p>
          <button
            type="button"
            onclick={() => router.navigate(auth.getDefaultAvailablePath(), true)}
            class="mt-4 px-3.5 py-1.5 rounded-md border text-xs font-medium hover:bg-[var(--bg-hover)] text-neutral-700 dark:text-neutral-300"
          >
            Beralih ke Menu yang Tersedia
          </button>
        </div>
      {:else}
        <div class="py-16 text-center">
          <h2 class="text-2xl font-bold">404</h2>
          <p class="text-xs text-neutral-500 mt-1">Halaman tidak ditemukan.</p>
          <button
            type="button"
            onclick={() => router.navigate(auth.getDefaultAvailablePath(), true)}
            class="mt-4 px-3 py-1.5 rounded-md border text-xs font-medium hover:bg-[var(--bg-hover)]"
          >
            Kembali ke Menu Utama
          </button>
        </div>
      {/if}
    </AppLayout>
  {/if}

  <ToastContainer />
  <ConfirmDialog />
{/if}

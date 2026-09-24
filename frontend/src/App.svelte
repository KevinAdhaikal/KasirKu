<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { auth, Permissions } from './lib/stores/auth.svelte';
  import { router } from './lib/stores/router.svelte';
  import { sse } from './lib/stores/sse.svelte';
  import { progress } from './lib/stores/progress.svelte';
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
          router.navigate('/', true);
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

  // Watch route & authentication strictly (untracking SSE status & router reads)
  $effect(() => {
    const isAuth = auth.isAuthenticated;
    const isInit = auth.isInitialized;

    if (isInit) {
      untrack(() => {
        if (!isAuth) {
          sse.disconnect();
          if (router.currentPath !== '/login') {
            router.navigate('/login', true);
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
      {#if router.currentPath === '/' || router.currentPath === '/dashboard'}
        <Dashboard />
      {:else if router.currentPath === '/profile'}
        <Profile />
      {:else if router.currentPath === '/kasir'}
        <Kasir />
      {:else if router.currentPath === '/barang/daftar_barang'}
        <DaftarBarang />
      {:else if router.currentPath === '/barang/kategori_barang'}
        <KategoriBarang />
      {:else if router.currentPath === '/barang/barang_masuk'}
        <BarangMasuk />
      {:else if router.currentPath === '/barang/retur_barang'}
        <ReturBarang />
      {:else if router.currentPath === '/pembukuan/penjualan' || router.currentPath === '/penjualan'}
        <Penjualan />
      {:else if router.currentPath === '/pembukuan/pengeluaran' || router.currentPath === '/pengeluaran'}
        <Pengeluaran />
      {:else if router.currentPath === '/pembukuan/laporan' || router.currentPath === '/laporan'}
        <Laporan />
      {:else if router.currentPath === '/users'}
        <Users />
      {:else if router.currentPath === '/rp'}
        <Roles />
      {:else if router.currentPath === '/settings'}
        <Settings />
      {:else}
        <div class="py-16 text-center">
          <h2 class="text-2xl font-bold">404</h2>
          <p class="text-xs text-neutral-500 mt-1">Halaman tidak ditemukan.</p>
          <button
            type="button"
            onclick={() => router.navigate('/')}
            class="mt-4 px-3 py-1.5 rounded-md border text-xs font-medium hover:bg-[var(--bg-hover)]"
          >
            Kembali ke Dashboard
          </button>
        </div>
      {/if}
    </AppLayout>
  {/if}

  <ToastContainer />
  <ConfirmDialog />
{/if}

<script lang="ts">
  import { onMount } from 'svelte';
  import { auth, Permissions } from './lib/stores/auth.svelte';
  import { router } from './lib/stores/router.svelte';
  import { sse } from './lib/stores/sse.svelte';
  import AppLayout from './lib/components/layout/AppLayout.svelte';
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
  import RiwayatPenjualan from './lib/routes/pembukuan/RiwayatPenjualan.svelte';
  import PengeluaranToko from './lib/routes/pembukuan/PengeluaranToko.svelte';
  import LaporanFinansial from './lib/routes/pembukuan/LaporanFinansial.svelte';
  import DaftarPengguna from './lib/routes/admin/DaftarPengguna.svelte';
  import RolesPermissions from './lib/routes/admin/RolesPermissions.svelte';
  import PengaturanToko from './lib/routes/admin/PengaturanToko.svelte';

  onMount(async () => {
    await auth.init();

    if (auth.isAuthenticated) {
      sse.connect();
      if (router.currentPath === '/login') {
        router.navigate('/', true);
      }
    } else {
      if (router.currentPath !== '/login') {
        router.navigate('/login', true);
      }
    }
  });

  // Watch route & authentication
  $effect(() => {
    if (!auth.isLoading) {
      if (!auth.isAuthenticated) {
        sse.disconnect();
        if (router.currentPath !== '/login') {
          router.navigate('/login', true);
        }
      } else {
        sse.connect();
        if (router.currentPath === '/login') {
          router.navigate('/', true);
        }
      }
    }
  });
</script>

{#if auth.isLoading}
  <div class="min-h-screen flex flex-col items-center justify-center bg-[var(--bg-canvas)] text-neutral-900 dark:text-neutral-100">
    <div class="w-8 h-8 rounded-lg bg-[var(--brand)] text-[var(--accent-fg)] flex items-center justify-center font-bold text-sm shadow-sm animate-pulse mb-3">
      K
    </div>
    <p class="text-xs font-mono text-neutral-500">Memuat sistem KasirKu…</p>
  </div>
{:else if !auth.isAuthenticated}
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
      <RiwayatPenjualan />
    {:else if router.currentPath === '/pembukuan/pengeluaran' || router.currentPath === '/pengeluaran'}
      <PengeluaranToko />
    {:else if router.currentPath === '/pembukuan/laporan' || router.currentPath === '/laporan'}
      <LaporanFinansial />
    {:else if router.currentPath === '/users'}
      <DaftarPengguna />
    {:else if router.currentPath === '/rp'}
      <RolesPermissions />
    {:else if router.currentPath === '/settings'}
      <PengaturanToko />
    {:else}
      <div class="py-16 text-center">
        <h2 class="text-2xl font-bold font-mono">404</h2>
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

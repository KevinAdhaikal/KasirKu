<script lang="ts">
  import { router } from '../../stores/router.svelte';
  import { auth, Permissions } from '../../stores/auth.svelte';
  import { ui } from '../../stores/ui.svelte';
  import { dialog } from '../../stores/dialog.svelte';
  import { sse } from '../../stores/sse.svelte';
  import { toast } from '../../stores/toast.svelte';
  import SseStatus from './SseStatus.svelte';
  import ThemeToggle from './ThemeToggle.svelte';
  import CalendarWidget from './CalendarWidget.svelte';
  import {
    Menu,
    LogOut,
    ShoppingBag,
    PanelLeft,
    LayoutDashboard,
    Package,
    Tag,
    ArrowDownToLine,
    Undo2,
    ReceiptText,
    TrendingDown,
    BarChart3,
    Users,
    ShieldAlert,
    Settings,
    UserCircle,
  } from 'lucide-svelte';

  interface Props {
    ontogglemobile?: () => void;
  }

  let { ontogglemobile }: Props = $props();

  const routeTitles: Record<string, { title: string; section: string; icon: any }> = {
    '/': { title: 'Dashboard', section: 'Utama', icon: LayoutDashboard },
    '/kasir': { title: 'Kasir', section: 'Utama', icon: ShoppingBag },
    '/barang/daftar_barang': { title: 'Daftar Barang', section: 'Barang', icon: Package },
    '/barang/kategori_barang': { title: 'Kategori Barang', section: 'Barang', icon: Tag },
    '/barang/barang_masuk': { title: 'Barang Masuk', section: 'Barang', icon: ArrowDownToLine },
    '/barang/retur_barang': { title: 'Retur Barang', section: 'Barang', icon: Undo2 },
    '/pembukuan/penjualan': { title: 'Penjualan', section: 'Pembukuan', icon: ReceiptText },
    '/pembukuan/pengeluaran': { title: 'Pengeluaran', section: 'Pembukuan', icon: TrendingDown },
    '/pembukuan/laporan': { title: 'Laporan', section: 'Pembukuan', icon: BarChart3 },
    '/users': { title: 'Users', section: 'Sistem', icon: Users },
    '/rp': { title: 'Roles', section: 'Sistem', icon: ShieldAlert },
    '/settings': { title: 'Settings', section: 'Sistem', icon: Settings },
    '/profile': { title: 'Profile', section: 'User', icon: UserCircle },
  };

  const currentMeta = $derived(routeTitles[router.currentPath] || { title: 'KasirKu', section: 'Halaman', icon: null });

  async function handleLogout() {
    const confirmed = await dialog.confirm({
      title: 'Keluar dari Akun KasirKu',
      message: 'Apakah Anda yakin ingin mengakhiri sesi kasir saat ini? Anda harus login kembali untuk melanjutkan.',
      confirmText: 'Keluar Akun',
      cancelText: 'Batal',
      variant: 'danger',
    });
    if (confirmed) {
      sse.disconnect();
      await auth.logout();
      router.navigate('/login', true);
    }
  }
</script>

<header class="h-14 border-b border-neutral-200/80 dark:border-neutral-800 bg-[var(--bg-surface)]/90 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6">
  <!-- Left: Hamburger (Mobile) / Sidebar Collapse Toggle (Desktop) + Breadcrumb -->
  <div class="flex items-center gap-2.5 min-w-0">
    <!-- Mobile Hamburger Button -->
    <button
      type="button"
      class="p-1.5 -ml-1.5 rounded-md text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 hover:bg-[var(--bg-hover)] lg:hidden"
      onclick={ontogglemobile}
      aria-label="Buka menu navigasi"
    >
      <Menu class="w-5 h-5" />
    </button>

    <!-- Desktop Sidebar Toggle Button (especially visible when sidebar is collapsed) -->
    <button
      type="button"
      class="hidden lg:flex p-1.5 -ml-1.5 rounded-md text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-[var(--bg-hover)] transition-colors"
      onclick={() => ui.toggleSidebar()}
      aria-label="Toggle sidebar (Ctrl+B)"
      title="Toggle sidebar (Ctrl+B)"
    >
      <PanelLeft class="w-4 h-4" />
    </button>

    <div class="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400 min-w-0">
      <span class="hidden sm:inline font-medium uppercase tracking-wider text-[10px] text-neutral-400 dark:text-neutral-500">{currentMeta.section}</span>
      <span class="hidden sm:inline text-neutral-300 dark:text-neutral-700">/</span>
      <span class="font-semibold text-neutral-900 dark:text-neutral-100 truncate text-sm flex items-center gap-1.5">
        {#if currentMeta.icon}
          {@const MetaIcon = currentMeta.icon}
          <MetaIcon class="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400 shrink-0" strokeWidth={1.75} />
        {/if}
        <span>{currentMeta.title}</span>
      </span>
    </div>
  </div>

  <!-- Right: Shortcuts, Status & Controls -->
  <div class="flex items-center gap-2 sm:gap-3 shrink-0">
    <!-- Quick POS Button if on other page -->
    {#if router.currentPath !== '/kasir' && auth.can(Permissions.KASIR)}
      <button
        type="button"
        onclick={() => {
          if (sse.status !== 'online') {
            toast.warning('Server sedang terputus (SSE offline). Navigasi dinonaktifkan.', 'Koneksi Offline');
            return;
          }
          router.navigate('/kasir');
        }}
        disabled={sse.status !== 'online'}
        title={sse.status !== 'online' ? 'Server terputus (SSE offline) - Navigasi dinonaktifkan' : 'Buka Kasir'}
        class="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-[var(--brand)] text-[var(--accent-fg)] hover:bg-[var(--brand-hover)] shadow-2xs transition-colors {sse.status !== 'online' ? 'opacity-40 cursor-not-allowed' : ''}"
      >
        <ShoppingBag class="w-3.5 h-3.5" />
        <span>Buka Kasir</span>
      </button>
    {/if}

    <!-- Live Interactive Calendar Widget -->
    <CalendarWidget />

    <SseStatus />
    <ThemeToggle />

    <!-- Sign Out button -->
    <button
      type="button"
      onclick={handleLogout}
      class="inline-flex h-9 w-9 items-center justify-center rounded-md border border-neutral-200 bg-white text-neutral-500 shadow-[0_1px_1px_rgba(0,0,0,0.04)] transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-400 dark:hover:border-red-900/60 dark:hover:bg-red-950/30 dark:hover:text-red-400"
      aria-label="Keluar dari akun"
      title="Keluar (Sign Out)"
    >
      <LogOut class="w-4 h-4" />
    </button>
  </div>
</header>

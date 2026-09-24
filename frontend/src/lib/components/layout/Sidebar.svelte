<script lang="ts">
  import { onMount } from 'svelte';
  import { router } from '../../stores/router.svelte';
  import { auth, Permissions } from '../../stores/auth.svelte';
  import { ui } from '../../stores/ui.svelte';
  import { sse } from '../../stores/sse.svelte';
  import { toast } from '../../stores/toast.svelte';
  import {
    LayoutDashboard,
    ShoppingBag,
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
    X,
    WifiOff,
  } from 'lucide-svelte';

  let isMobile = $state(typeof window !== 'undefined' ? window.innerWidth < 1024 : false);

  onMount(() => {
    const handleResize = () => {
      isMobile = window.innerWidth < 1024;
      if (!isMobile && ui.mobileSidebarOpen) {
        ui.closeMobileSidebar();
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  });

  // Sidebar hanya boleh collapsed jika berada di desktop (layar lebar >= 1024px)
  // Di mobile / android (< 1024px), sidebar drawer selalu tampil penuh dengan teks
  const isCollapsed = $derived(!isMobile && ui.sidebarCollapsed && !ui.mobileSidebarOpen);

  const isSseDown = $derived(sse.status !== 'online');

  function handleNav(path: string) {
    if (isSseDown) {
      toast.warning(
        'Server terputus (SSE offline). Anda tidak dapat berpindah halaman hingga server online.',
        'Realtime Terputus'
      );
      return;
    }
    // Jika sedang berada di menu yang sama (current), jangan lakukan apa-apa & jangan munculkan progress
    if (router.matches(path)) {
      ui.closeMobileSidebar();
      return;
    }
    router.navigate(path);
    ui.closeMobileSidebar();
  }

  function handleKeydown(e: KeyboardEvent) {
    // Ctrl+B or Cmd+B to toggle sidebar collapse
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      ui.toggleSidebar();
    }
  }

  interface NavItem {
    name: string;
    path: string;
    icon: any;
    permission: number;
  }

  interface NavGroup {
    title: string;
    items: NavItem[];
  }

  const navGroups: NavGroup[] = [
    {
      title: 'UTAMA',
      items: [
        { name: 'Dashboard', path: '/', icon: LayoutDashboard, permission: Permissions.DASHBOARD },
        { name: 'Kasir', path: '/kasir', icon: ShoppingBag, permission: Permissions.KASIR },
      ],
    },
    {
      title: 'BARANG',
      items: [
        { name: 'Daftar Barang', path: '/barang/daftar_barang', icon: Package, permission: Permissions.MANAGE_BARANG },
        { name: 'Kategori Barang', path: '/barang/kategori_barang', icon: Tag, permission: Permissions.MANAGE_BARANG },
        { name: 'Barang Masuk', path: '/barang/barang_masuk', icon: ArrowDownToLine, permission: Permissions.MANAGE_BARANG },
        { name: 'Retur Barang', path: '/barang/retur_barang', icon: Undo2, permission: Permissions.MANAGE_BARANG },
      ],
    },
    {
      title: 'PEMBUKUAN',
      items: [
        { name: 'Penjualan', path: '/pembukuan/penjualan', icon: ReceiptText, permission: Permissions.MANAGE_PEMBUKUAN },
        { name: 'Pengeluaran', path: '/pembukuan/pengeluaran', icon: TrendingDown, permission: Permissions.MANAGE_PEMBUKUAN },
        { name: 'Laporan', path: '/pembukuan/laporan', icon: BarChart3, permission: Permissions.MANAGE_PEMBUKUAN },
      ],
    },
    {
      title: 'SISTEM',
      items: [
        { name: 'Users', path: '/users', icon: Users, permission: Permissions.ADMINISTRATOR },
        { name: 'Roles', path: '/rp', icon: ShieldAlert, permission: Permissions.ADMINISTRATOR },
      ],
    },
  ];

  const visibleNavGroups = $derived.by(() => {
    const user = auth.user;
    // Always show all navigation groups for Administrator or if user profile is initializing
    if (!user || user.role_name === 'Administrator' || (Number(user.permission_level) & Permissions.ADMINISTRATOR)) {
      return navGroups;
    }
    return navGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => auth.can(item.permission)),
      }))
      .filter((group) => group.items.length > 0);
  });
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- Mobile Overlay Backdrop -->
{#if ui.mobileSidebarOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-xs"
    onclick={() => ui.closeMobileSidebar()}
  ></div>
{/if}

<!-- Sidebar Container -->
<aside
  class="fixed top-0 bottom-0 left-0 z-40 border-r border-neutral-200 dark:border-neutral-800 bg-[var(--bg-surface)] flex flex-col transition-all duration-200 ease-out
    lg:translate-x-0
    {ui.mobileSidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'}
    {isCollapsed ? 'lg:w-16' : 'lg:w-64'}"
>
  <!-- Header / Brand -->
  <div class="h-14 px-3 flex items-center justify-between border-b border-neutral-200/80 dark:border-neutral-800 overflow-hidden">
    {#if !isCollapsed}
      <button
        type="button"
        onclick={() => handleNav('/')}
        disabled={isSseDown}
        class="flex items-center gap-2.5 text-left group focus-visible:outline-none min-w-0 {isSseDown ? 'opacity-50 cursor-not-allowed' : ''}"
        title={isSseDown ? 'Server terputus (SSE offline) - Navigasi dinonaktifkan' : 'KasirKu'}
      >
        <div class="w-8 h-8 rounded-md bg-[var(--bg-subtle)] flex items-center justify-center shadow-xs group-hover:scale-[1.02] transition-transform shrink-0 overflow-hidden">
          <img src="/images/kasirku.png" alt="KasirKu" class="w-full h-full object-contain" />
        </div>
        <div class="min-w-0">
          <span class="text-sm font-semibold tracking-tight text-neutral-900 dark:text-neutral-100 truncate">KasirKu</span>
        </div>
      </button>
    {:else}
      <!-- Collapsed Logo Icon -->
      <button
        type="button"
        onclick={() => handleNav('/')}
        disabled={isSseDown}
        class="w-full flex justify-center py-1 group focus-visible:outline-none {isSseDown ? 'opacity-50 cursor-not-allowed' : ''}"
        title={isSseDown ? 'Server terputus (SSE offline) - Navigasi dinonaktifkan' : 'KasirKu - Kembali ke Beranda'}
      >
        <div class="w-8 h-8 rounded-md bg-[var(--bg-subtle)] flex items-center justify-center shadow-xs group-hover:scale-[1.05] transition-transform overflow-hidden">
          <img src="/images/kasirku.png" alt="KasirKu" class="w-full h-full object-contain" />
        </div>
      </button>
    {/if}

    <!-- Mobile Close Button -->
    <button
      type="button"
      class="p-1 rounded-md text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 lg:hidden"
      onclick={() => ui.closeMobileSidebar()}
      aria-label="Tutup menu sidebar"
    >
      <X class="w-5 h-5" />
    </button>
  </div>

  <!-- Navigation Groups -->
  <div class="flex-1 overflow-y-auto px-2.5 py-3 space-y-4">
    {#each visibleNavGroups as group}
      <div>
        {#if !isCollapsed}
          <h4 class="px-2 mb-1 text-[10px] font-semibold tracking-wider text-neutral-400 dark:text-neutral-500 uppercase">
            {group.title}
          </h4>
        {:else}
          <div class="border-t border-neutral-200/70 dark:border-neutral-800/80 my-2 mx-1"></div>
        {/if}

        <div class="space-y-0.5">
          {#each group.items as item}
            {@const active = router.matches(item.path)}
            {@const Icon = item.icon}
            <button
              type="button"
              onclick={() => handleNav(item.path)}
              disabled={isSseDown}
              title={isSseDown ? 'Server sedang terputus (SSE offline). Navigasi dinonaktifkan.' : item.name}
              class="w-full flex items-center rounded-md text-[13px] font-medium transition-colors text-left select-none
                {isCollapsed ? 'justify-center p-3' : 'gap-2.5 px-3 py-2.5'}
                {isSseDown
                  ? 'opacity-40 cursor-not-allowed'
                  : active
                    ? 'bg-[var(--brand-soft)] text-[var(--brand-ink)] font-semibold ring-1 ring-inset ring-[var(--brand)]/10'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-[var(--bg-hover)]'}"
            >
              <Icon class="w-[17px] h-[17px] shrink-0 {active && !isSseDown ? 'text-current' : 'text-neutral-500 dark:text-neutral-400'}" strokeWidth={1.75} />
              {#if !isCollapsed}
                <span class="truncate">{item.name}</span>
              {/if}
            </button>
          {/each}
        </div>
      </div>
    {/each}
  </div>

  <!-- Footer / Profile & Settings & Expand Button -->
  <div class="p-2 border-t border-neutral-200/80 dark:border-neutral-800 space-y-1.5">
    {#if !auth.user || auth.user.role_name === 'Administrator' || auth.can(Permissions.ADMINISTRATOR)}
      <button
        type="button"
        onclick={() => handleNav('/settings')}
        disabled={isSseDown}
        title={isSseDown ? 'Server sedang terputus (SSE offline). Navigasi dinonaktifkan.' : 'Settings'}
        class="w-full flex items-center rounded-md text-[13px] font-medium transition-colors text-left select-none
          {isCollapsed ? 'justify-center p-3' : 'gap-2.5 px-3 py-2.5'}
          {isSseDown
            ? 'opacity-40 cursor-not-allowed'
            : router.matches('/settings')
              ? 'bg-[var(--brand-soft)] text-[var(--brand-ink)] font-semibold ring-1 ring-inset ring-[var(--brand)]/10'
              : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-[var(--bg-hover)]'}"
      >
        <Settings class="w-4 h-4 shrink-0" strokeWidth={1.75} />
        {#if !isCollapsed}
          <span>Settings</span>
        {/if}
      </button>
    {/if}

    <button
      type="button"
      onclick={() => handleNav('/profile')}
      disabled={isSseDown}
      title={isSseDown ? 'Server sedang terputus (SSE offline). Navigasi dinonaktifkan.' : (auth.user?.full_name || 'Profile')}
      class="w-full flex items-center rounded-md text-[13px] font-medium transition-colors text-left select-none
        {isCollapsed ? 'justify-center p-3' : 'gap-2.5 px-3 py-2.5'}
        {isSseDown
          ? 'opacity-40 cursor-not-allowed'
          : router.matches('/profile')
            ? 'bg-[var(--brand-soft)] text-[var(--brand-ink)] font-semibold ring-1 ring-inset ring-[var(--brand)]/10'
            : 'text-neutral-700 dark:text-neutral-300 hover:bg-[var(--bg-hover)]'}"
    >
      {#if auth.user?.profile_img}
        <img src={auth.user.profile_img} alt="Avatar" class="w-5 h-5 rounded-full object-cover shrink-0 border border-neutral-300 dark:border-neutral-700" />
      {:else}
        <UserCircle class="w-5 h-5 shrink-0 {router.matches('/profile') && !isSseDown ? 'text-[var(--brand-ink)]' : 'text-neutral-400 dark:text-neutral-500'}" strokeWidth={1.75} />
      {/if}
      {#if !isCollapsed}
        <div class="min-w-0 flex-1">
          <p class="text-xs font-medium truncate {router.matches('/profile') && !isSseDown ? 'text-[var(--brand-ink)] font-semibold' : 'text-neutral-900 dark:text-neutral-100'}">
            {auth.user?.full_name || 'Pengguna'}
          </p>
          <p class="text-[10px] truncate {router.matches('/profile') && !isSseDown ? 'text-[var(--brand)] dark:text-[var(--brand-hover)] font-medium' : 'text-neutral-500 dark:text-neutral-400'}">
            {auth.user?.role_name || 'Kasir'}
          </p>
        </div>
      {/if}
    </button>

  </div>
</aside>

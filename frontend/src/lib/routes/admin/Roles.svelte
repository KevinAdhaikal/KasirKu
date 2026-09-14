<svelte:head>
  <title>KasirKu | Roles</title>
</svelte:head>

<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { api } from '../../api/api';
  import { auth, Permissions } from '../../stores/auth.svelte';
  import { toast } from '../../stores/toast.svelte';
  import { confirmDialog } from '../../stores/dialog.svelte';
  import { sse } from '../../stores/sse.svelte';
  import Button from '../../components/ui/Button.svelte';
  import Input from '../../components/ui/Input.svelte';
  import Modal from '../../components/ui/Modal.svelte';
  import Badge from '../../components/ui/Badge.svelte';
  import Skeleton from '../../components/ui/Skeleton.svelte';
  import TablePagination from '../../components/ui/TablePagination.svelte';
  import { formatDateTime } from '../../utils/format';
  import {
    ShieldAlert,
    Shield,
    ShieldPlus,
    Search,
    RefreshCw,
    Pencil,
    Eye,
    Trash2,
    Check,
    AlertCircle,
    LayoutDashboard,
    ShoppingCart,
    Package,
    BookOpen,
    Users,
    User,
    Lock,
    Info,
    ArrowUp,
    ArrowDown,
    ArrowUpDown
  } from 'lucide-svelte';

  export interface RoleItem {
    id: number;
    name: string;
    permission_level: number;
    created_ms: number;
    modified_ms: number;
  }

  export interface UserItem {
    id: number;
    role_id: number;
  }

  export interface AssignedUser {
    username: string;
    full_name: string;
  }

  let roleList = $state<RoleItem[]>([]);
  let userList = $state<UserItem[]>([]);
  let loading = $state(true);
  let searchQuery = $state('');

  // Sorting
  let sortField = $state<'id' | 'name' | 'created_ms' | 'modified_ms' | 'users'>('id');
  let sortAsc = $state(true);

  // Permission Modules Config (matching backend bitwise permissions)
  const MODULES = [
    {
      bit: Permissions.MANAGE_BARANG, // 2 (1 << 1)
      id: 'perm_barang',
      label: 'Kelola Barang & Stok',
      description: 'Menambah, mengubah, menghapus produk, kategori, barang masuk, dan retur.',
      icon: Package,
    },
    {
      bit: Permissions.KASIR, // 4 (1 << 2)
      id: 'perm_kasir',
      label: 'Terminal Kasir (POS)',
      description: 'Melakukan transaksi penjualan kasir, scan barcode, dan cetak struk belanja.',
      icon: ShoppingCart,
    },
    {
      bit: Permissions.MANAGE_PEMBUKUAN, // 8 (1 << 3)
      id: 'perm_pembukuan',
      label: 'Pembukuan & Finansial',
      description: 'Melihat log riwayat penjualan, mencatat beban pengeluaran toko, dan laporan laba rugi.',
      icon: BookOpen,
    },
    {
      bit: Permissions.DASHBOARD, // 16 (1 << 4)
      id: 'perm_dashboard',
      label: 'Dashboard & Ringkasan',
      description: 'Melihat ringkasan metrik omzet, laba kotor, dan peringatan stok menipis.',
      icon: LayoutDashboard,
    },
  ];

  // Modal: Add Role
  let isAddModalOpen = $state(false);
  let formRoleName = $state('');
  let roleNameError = $state<string | null>(null);
  let formSelectedBits = $state<number[]>([]);
  let isSubmittingAdd = $state(false);
  let addErrorMessage = $state<string | null>(null);

  // Modal: View / Edit Role
  let isEditModalOpen = $state(false);
  let editingRole = $state<RoleItem | null>(null);
  let editRoleName = $state('');
  let editRoleNameError = $state<string | null>(null);
  let editSelectedBits = $state<number[]>([]);
  let assignedUsers = $state<AssignedUser[]>([]);
  let loadingAssignedUsers = $state(false);
  let assignedUserSearch = $state('');
  let isSubmittingEdit = $state(false);
  let editErrorMessage = $state<string | null>(null);

  const userCountPerRole = $derived(() => {
    const map = new Map<number, number>();
    for (const u of userList) {
      map.set(u.role_id, (map.get(u.role_id) || 0) + 1);
    }
    return map;
  });

  async function fetchData() {
    loading = true;
    try {
      const [rolesRes, usersRes] = await Promise.all([
        api.get<RoleItem[]>('/api/roles'),
        api.get<UserItem[]>('/api/users'),
      ]);

      roleList = Array.isArray(rolesRes) ? rolesRes : [];
      userList = Array.isArray(usersRes) ? usersRes : [];
    } catch (err: any) {
      toast.error('Gagal memuat roles dan hak akses: ' + (err.message || ''));
    } finally {
      loading = false;
    }
  }

  function openAddModal() {
    formRoleName = '';
    roleNameError = null;
    // Default checked: Dashboard and Kasir
    formSelectedBits = [Permissions.DASHBOARD, Permissions.KASIR];
    addErrorMessage = null;
    isAddModalOpen = true;
  }

  function toggleAddBit(bit: number) {
    if (formSelectedBits.includes(bit)) {
      formSelectedBits = formSelectedBits.filter(b => b !== bit);
    } else {
      formSelectedBits = [...formSelectedBits, bit];
    }
  }

  const calculatedAddPermission = $derived(() => {
    return formSelectedBits.reduce((acc, bit) => acc | bit, 0);
  });

  async function handleAddRole(e: Event) {
    e.preventDefault();
    addErrorMessage = null;
    roleNameError = null;

    const name = formRoleName.trim();
    if (!name) {
      roleNameError = 'Nama role wajib diisi.';
      return;
    }

    const perm = calculatedAddPermission();
    if (perm === 0) {
      addErrorMessage = 'Minimal pilih salah satu modul hak akses untuk role ini.';
      return;
    }

    isSubmittingAdd = true;
    try {
      const params = new URLSearchParams({
        role_name: name,
        permission_level: String(perm),
      });

      await api.post('/api/role', params);
      toast.success(`Role "${name}" berhasil ditambahkan.`);
      isAddModalOpen = false;
      fetchData();
    } catch (err: any) {
      if (err.status === 403 && err.message === '1') {
        roleNameError = 'Nama role tersebut sudah terdaftar. Gunakan nama lain.';
      } else if (err.status === 403 && err.message === '0') {
        addErrorMessage = 'Anda tidak memiliki hak akses Administrator.';
      } else {
        addErrorMessage = err.message || 'Gagal menambahkan role baru.';
      }
    } finally {
      isSubmittingAdd = false;
    }
  }

  async function openEditModal(role: RoleItem) {
    editingRole = role;
    editRoleName = role.name;
    editRoleNameError = null;
    editErrorMessage = null;
    assignedUserSearch = '';
    assignedUsers = [];
    loadingAssignedUsers = true;

    // Populate permission checkboxes based on bitmask
    if (role.id === 1) {
      // Administrator has full permissions
      editSelectedBits = MODULES.map(m => m.bit);
    } else {
      editSelectedBits = MODULES.filter(m => (role.permission_level & m.bit) !== 0).map(m => m.bit);
    }

    isEditModalOpen = true;

    try {
      const [roleDetail, uarRes] = await Promise.all([
        api.get<RoleItem>(`/api/role?id=${role.id}`),
        api.get<AssignedUser[]>(`/api/uar_list?id=${role.id}`)
      ]);

      if (roleDetail) {
        editingRole = roleDetail;
        editRoleName = roleDetail.name;
        if (roleDetail.id !== 1) {
          editSelectedBits = MODULES.filter(m => (roleDetail.permission_level & m.bit) !== 0).map(m => m.bit);
        }
      }
      assignedUsers = Array.isArray(uarRes) ? uarRes : [];
    } catch (err: any) {
      toast.error('Gagal memuat detail role dan daftar pengguna: ' + (err.message || ''));
    } finally {
      loadingAssignedUsers = false;
    }
  }

  function toggleEditBit(bit: number) {
    if (!editingRole || editingRole.id === 1) return; // Admin permissions cannot be modified
    if (editSelectedBits.includes(bit)) {
      editSelectedBits = editSelectedBits.filter(b => b !== bit);
    } else {
      editSelectedBits = [...editSelectedBits, bit];
    }
  }

  const calculatedEditPermission = $derived(() => {
    return editSelectedBits.reduce((acc, bit) => acc | bit, 0);
  });

  async function handleEditRole(e: Event) {
    e.preventDefault();
    if (!editingRole) return;
    editErrorMessage = null;
    editRoleNameError = null;

    const name = editRoleName.trim();
    if (!name) {
      editRoleNameError = 'Nama role wajib diisi.';
      return;
    }

    let perm = 0;
    if (editingRole.id === 1) {
      // For Admin (ID 1), pass 0 as required by backend patch validation
      perm = 0;
    } else {
      perm = calculatedEditPermission();
      if (perm === 0) {
        editErrorMessage = 'Minimal pilih salah satu modul hak akses untuk role ini.';
        return;
      }
    }

    isSubmittingEdit = true;
    try {
      const params = new URLSearchParams({
        id: String(editingRole.id),
        new_role_name: name,
        new_permission_level: String(perm),
      });

      await api.patch('/api/role', params);
      toast.success(`Role "${name}" berhasil diperbarui.`);
      isEditModalOpen = false;
      fetchData();
    } catch (err: any) {
      if (err.status === 403 && err.message === '1') {
        editRoleNameError = 'Nama role tersebut sudah digunakan oleh role lain.';
      } else if (err.status === 403 && err.message === '0') {
        editErrorMessage = 'Anda tidak memiliki hak akses Administrator.';
      } else {
        editErrorMessage = err.message || 'Gagal memperbarui role.';
      }
    } finally {
      isSubmittingEdit = false;
    }
  }

  async function handleDeleteRole(role: RoleItem) {
    if (role.id === 1) {
      toast.error('Role Administrator sistem (ID 1) tidak dapat dihapus.');
      return;
    }

    const userCount = userCountPerRole().get(role.id) || 0;
    if (userCount > 0) {
      const confirmed = await confirmDialog({
        title: 'Role Masih Digunakan!',
        message: `Terdapat ${userCount} pengguna yang saat ini masih memiliki role "${role.name}". Menghapus role ini akan secara permanen menghapus akun pengguna terkait. Apakah Anda yakin ingin melanjutkan?`,
        confirmText: 'Ya, Hapus Role & Pengguna',
        cancelText: 'Batal',
        variant: 'danger',
      });

      if (!confirmed) return;

      try {
        const params = new URLSearchParams({
          id: String(role.id),
          recursive: '1',
        });
        await api.delete('/api/role', params);
        toast.success(`Role "${role.name}" dan akun pengguna terkait berhasil dihapus.`);
        fetchData();
      } catch (err: any) {
        toast.error('Gagal menghapus role: ' + (err.message || ''));
      }
      return;
    }

    const confirmed = await confirmDialog({
      title: 'Hapus Role Hak Akses?',
      message: `Apakah Anda yakin ingin menghapus role "${role.name}"? Tindakan ini tidak dapat dibatalkan.`,
      confirmText: 'Ya, Hapus Role',
      cancelText: 'Batal',
      variant: 'danger',
    });

    if (!confirmed) return;

    try {
      const params = new URLSearchParams({
        id: String(role.id),
      });
      await api.delete('/api/role', params);
      toast.success(`Role "${role.name}" berhasil dihapus.`);
      fetchData();
    } catch (err: any) {
      if (err.status === 403 && err.message === '2') {
        // In case a user was assigned concurrently
        const forceConfirmed = await confirmDialog({
          title: 'Role Masih Memiliki Pengguna Terkait',
          message: `Role "${role.name}" saat ini terhubung dengan satu atau lebih pengguna. Menghapus role ini akan menghapus seluruh akun pengguna tersebut. Lanjutkan?`,
          confirmText: 'Ya, Hapus Paksa',
          cancelText: 'Batal',
          variant: 'danger',
        });
        if (forceConfirmed) {
          try {
            const forceParams = new URLSearchParams({
              id: String(role.id),
              recursive: '1',
            });
            await api.delete('/api/role', forceParams);
            toast.success(`Role "${role.name}" berhasil dihapus.`);
            fetchData();
          } catch (e: any) {
            toast.error('Gagal menghapus role: ' + (e.message || ''));
          }
        }
      } else {
        toast.error('Gagal menghapus role: ' + (err.message || ''));
      }
    }
  }

  function toggleSort(field: typeof sortField) {
    if (sortField === field) {
      sortAsc = !sortAsc;
    } else {
      sortField = field;
      sortAsc = true;
    }
  }

  // Filtered and Sorted Roles
  let filteredRoles = $derived.by(() => {
    let list = [...roleList];
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(r => r.name.toLowerCase().includes(q) || String(r.id).includes(q));
    }

    list.sort((a, b) => {
      let va: any;
      let vb: any;

      if (sortField === 'users') {
        va = userCountPerRole().get(a.id) || 0;
        vb = userCountPerRole().get(b.id) || 0;
      } else {
        va = a[sortField] ?? 0;
        vb = b[sortField] ?? 0;
      }

      if (typeof va === 'string') va = (va as string).toLowerCase();
      if (typeof vb === 'string') vb = (vb as string).toLowerCase();
      if (va < vb) return sortAsc ? -1 : 1;
      if (va > vb) return sortAsc ? 1 : -1;
      return 0;
    });

    return list;
  });

  // Pagination
  let currentPage = $state(1);
  let pageSize = $state(10);
  const paginatedRoles = $derived(
    filteredRoles.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  );
  const totalPages = $derived(Math.ceil(filteredRoles.length / pageSize) || 1);

  $effect(() => {
    void searchQuery;
    currentPage = 1;
  });

  // Filtered Assigned Users in modal
  let filteredAssignedUsers = $derived.by(() => {
    const q = assignedUserSearch.trim().toLowerCase();
    if (!q) return assignedUsers;
    return assignedUsers.filter(u =>
      u.full_name.toLowerCase().includes(q) || u.username.toLowerCase().includes(q)
    );
  });

  // SSE Unsubscribe handler
  let sseUnsub: (() => void) | null = null;

  onMount(() => {
    fetchData();
    sseUnsub = sse.subscribe((event) => {
      if (event?.code === 'REFRESH_RP' || event?.code === 'REFRESH_USERS') {
        fetchData();
      }
    });
  });

  onDestroy(() => {
    if (sseUnsub) sseUnsub();
  });
</script>

<div class="space-y-6">
  <!-- Page Header -->
  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-4">
    <div class="flex items-center gap-2.5">
      <h1 class="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
        <ShieldAlert class="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
        <span>Roles</span>
      </h1>
    </div>

    <div class="flex items-center gap-2 shrink-0">
      <Button variant="secondary" size="sm" onclick={fetchData} loading={loading} title="Segarkan Data">
        <RefreshCw class="w-3.5 h-3.5" />
        <span class="hidden sm:inline">Refresh</span>
      </Button>
      <Button variant="primary" size="sm" onclick={openAddModal}>
        <ShieldPlus class="w-3.5 h-3.5" />
        <span>Tambah Role</span>
      </Button>
    </div>
  </div>

  <!-- Search Filter -->
  <div class="relative flex-1 max-w-md">
    <Search class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
    <input
      type="text"
      placeholder="Cari nama role atau ID..."
      bind:value={searchQuery}
      class="w-full pl-9 pr-4 py-2 text-xs rounded-md border border-neutral-200 dark:border-neutral-700 bg-[var(--bg-surface)] text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/25 focus:border-[var(--brand)] dark:focus:ring-[var(--brand)]/25 dark:focus:border-[var(--brand)]"
    />
  </div>

  <!-- Roles Table -->
  <div class="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-[var(--bg-surface)] overflow-hidden shadow-2xs">
    <div class="overflow-x-auto">
      <table class="w-full text-xs border-collapse">
        <thead class="bg-neutral-50/70 dark:bg-neutral-900/50 border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 uppercase font-mono text-[10px] font-semibold tracking-wider text-center">
          <tr>
            <th class="py-2.5 px-3 text-center w-16 cursor-pointer hover:text-neutral-900 dark:hover:text-neutral-100" onclick={() => toggleSort('id')}>
              <div class="inline-flex items-center justify-center gap-1">
                <span>ID</span>
                {#if sortField === 'id'}
                  {#if sortAsc}<ArrowUp class="w-3 h-3 text-neutral-900 dark:text-neutral-100" />{:else}<ArrowDown class="w-3 h-3 text-neutral-900 dark:text-neutral-100" />{/if}
                {:else}
                  <ArrowUpDown class="w-3 h-3 opacity-40" />
                {/if}
              </div>
            </th>
            <th class="py-2.5 px-3 text-center cursor-pointer hover:text-neutral-900 dark:hover:text-neutral-100" onclick={() => toggleSort('name')}>
              <div class="inline-flex items-center justify-center gap-1">
                <span>Role Name</span>
                {#if sortField === 'name'}
                  {#if sortAsc}<ArrowUp class="w-3 h-3 text-neutral-900 dark:text-neutral-100" />{:else}<ArrowDown class="w-3 h-3 text-neutral-900 dark:text-neutral-100" />{/if}
                {:else}
                  <ArrowUpDown class="w-3 h-3 opacity-40" />
                {/if}
              </div>
            </th>
            <th class="py-2.5 px-3 text-center cursor-pointer hover:text-neutral-900 dark:hover:text-neutral-100" onclick={() => toggleSort('created_ms')}>
              <div class="inline-flex items-center justify-center gap-1">
                <span>Created At</span>
                {#if sortField === 'created_ms'}
                  {#if sortAsc}<ArrowUp class="w-3 h-3 text-neutral-900 dark:text-neutral-100" />{:else}<ArrowDown class="w-3 h-3 text-neutral-900 dark:text-neutral-100" />{/if}
                {:else}
                  <ArrowUpDown class="w-3 h-3 opacity-40" />
                {/if}
              </div>
            </th>
            <th class="py-2.5 px-3 text-center cursor-pointer hover:text-neutral-900 dark:hover:text-neutral-100" onclick={() => toggleSort('modified_ms')}>
              <div class="inline-flex items-center justify-center gap-1">
                <span>Modified At</span>
                {#if sortField === 'modified_ms'}
                  {#if sortAsc}<ArrowUp class="w-3 h-3 text-neutral-900 dark:text-neutral-100" />{:else}<ArrowDown class="w-3 h-3 text-neutral-900 dark:text-neutral-100" />{/if}
                {:else}
                  <ArrowUpDown class="w-3 h-3 opacity-40" />
                {/if}
              </div>
            </th>
            <th class="py-2.5 px-3 text-center cursor-pointer hover:text-neutral-900 dark:hover:text-neutral-100" onclick={() => toggleSort('users')}>
              <div class="inline-flex items-center justify-center gap-1">
                <span>Pengguna</span>
                {#if sortField === 'users'}
                  {#if sortAsc}<ArrowUp class="w-3 h-3 text-neutral-900 dark:text-neutral-100" />{:else}<ArrowDown class="w-3 h-3 text-neutral-900 dark:text-neutral-100" />{/if}
                {:else}
                  <ArrowUpDown class="w-3 h-3 opacity-40" />
                {/if}
              </div>
            </th>
            <th class="py-2.5 px-3 text-center w-44">
              Aksi
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-neutral-200/70 dark:divide-neutral-800/80">
          {#if loading}
            {#each Array(3) as _}
              <tr>
                <td class="py-3 px-3 text-center"><Skeleton class="h-4 w-8 mx-auto" /></td>
                <td class="py-3 px-3 text-center"><Skeleton class="h-4 w-32 mx-auto" /></td>
                <td class="py-3 px-3 text-center"><Skeleton class="h-4 w-28 mx-auto" /></td>
                <td class="py-3 px-3 text-center"><Skeleton class="h-4 w-28 mx-auto" /></td>
                <td class="py-3 px-3 text-center"><Skeleton class="h-4 w-14 mx-auto" /></td>
                <td class="py-3 px-3 text-center"><Skeleton class="h-7 w-32 mx-auto" /></td>
              </tr>
            {/each}
          {:else if paginatedRoles.length === 0}
            <tr>
              <td colspan="6" class="py-12 text-center text-neutral-500">
                <div class="flex flex-col items-center justify-center gap-2">
                  <Shield class="w-8 h-8 text-neutral-400 opacity-60" />
                  <p class="font-medium text-xs">Tidak ada data role ditemukan.</p>
                  {#if searchQuery}
                    <button
                      type="button"
                      onclick={() => (searchQuery = '')}
                      class="text-xs text-neutral-900 dark:text-neutral-100 underline hover:opacity-80 mt-1"
                    >
                      Reset pencarian
                    </button>
                  {/if}
                </div>
              </td>
            </tr>
          {:else}
            {#each paginatedRoles as role (role.id)}
              {@const isAdministrator = role.id === 1 || role.name === 'Administrator'}
              {@const usersInRole = userCountPerRole().get(role.id) || 0}
              <tr class="hover:bg-neutral-50/70 dark:hover:bg-neutral-900/40 transition-colors">
                <!-- ID -->
                <td class="py-3 px-3 text-center font-medium text-neutral-500 tabular-nums">
                  #{role.id}
                </td>

                <!-- Role Name -->
                <td class="py-3 px-3 text-center">
                  <div class="inline-flex items-center justify-center gap-2">
                    <Shield class="w-3.5 h-3.5 {isAdministrator ? 'text-amber-500' : 'text-neutral-400'}" />
                    <span class="font-medium text-neutral-900 dark:text-neutral-100">{role.name}</span>
                    {#if isAdministrator}
                      <Badge variant="warning" size="sm">Default</Badge>
                    {/if}
                  </div>
                </td>

                <!-- Created At -->
                <td class="py-3 px-3 text-center tabular-nums text-neutral-500 text-[11px]">
                  {role.created_ms ? formatDateTime(role.created_ms) : '-'}
                </td>

                <!-- Modified At -->
                <td class="py-3 px-3 text-center tabular-nums text-neutral-500 text-[11px]">
                  {role.modified_ms ? formatDateTime(role.modified_ms) : '-'}
                </td>

                <!-- Users Count -->
                <td class="py-3 px-3 text-center tabular-nums">
                  <Badge variant={usersInRole > 0 ? 'neutral' : 'neutral'} size="sm">
                    <Users class="w-3 h-3 mr-1 opacity-70" />
                    {usersInRole} user
                  </Badge>
                </td>

                <!-- Actions -->
                <td class="py-3 px-3 text-center">
                  <div class="flex items-center justify-center gap-1.5">
                    <Button
                      variant="secondary"
                      size="sm"
                      class="min-w-28"
                      onclick={() => openEditModal(role)}
                      title="Lihat & Edit permission role serta daftar penggunanya"
                    >
                      <Eye class="w-3 h-3" />
                      <span>View / Edit</span>
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      disabled={isAdministrator}
                      onclick={() => handleDeleteRole(role)}
                      title={isAdministrator ? "Role Administrator tidak dapat dihapus" : "Hapus Role"}
                    >
                      <Trash2 class="w-3 h-3" />
                      <span class="hidden md:inline">Delete</span>
                    </Button>
                  </div>
                </td>
              </tr>
            {/each}
          {/if}
        </tbody>
      </table>
    </div>
    
    <!-- Pagination & Total Indicator with Limit -->
    <TablePagination
      bind:currentPage
      bind:pageSize
      totalItems={filteredRoles.length}
      currentItemsCount={paginatedRoles.length}
      itemLabel="role"
      storageKey="roles_limit"
    />
  </div>
</div>

<!-- MODAL: Tambah Role (Size Large: max-w-3xl) -->
<Modal bind:open={isAddModalOpen} title="Tambah Role Hak Akses Baru" size="lg">
  <form novalidate onsubmit={handleAddRole} class="space-y-4">
    {#if addErrorMessage}
      <div class="p-3 rounded-md border border-red-500/30 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 text-xs flex items-start gap-2">
        <AlertCircle class="w-4 h-4 shrink-0 mt-0.5" />
        <span>{addErrorMessage}</span>
      </div>
    {/if}

    <Input
      id="add-role-name"
      label="Role Name"
      bind:value={formRoleName}
      placeholder="contoh: Kasir Toko, Gudang & Logistik, Supervisor"
      hint="Masukkan nama role yang akan dibuat. Nama role harus unik dan menggambarkan fungsinya."
      autofocus
      error={roleNameError}
      oninput={() => {
        if (formRoleName.trim()) roleNameError = null;
      }}
      onblur={() => {
        if (!formRoleName.trim()) roleNameError = 'Nama role wajib diisi.';
      }}
      required
    >
      {#snippet prefix()}
        <Shield class="w-4 h-4 text-neutral-400" />
      {/snippet}
    </Input>

    <!-- Permission Checkboxes -->
    <div class="space-y-2 pt-2">
      <div class="flex items-center justify-between border-t border-neutral-200 dark:border-neutral-800 pt-3">
        <span class="block text-xs font-semibold text-neutral-900 dark:text-neutral-100">
          Permissions (Modul Hak Akses) <span class="text-red-500 font-bold">*</span>
        </span>
        <span class="text-[11px] font-mono text-neutral-500">
          {formSelectedBits.length} modul dipilih
        </span>
      </div>
      <p class="text-[11px] text-neutral-500">
        Pilih hak akses yang akan diberikan kepada role ini. Centang satu atau lebih permission sesuai kebutuhan.
      </p>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        {#each MODULES as mod}
          {@const isChecked = formSelectedBits.includes(mod.bit)}
          <button
            type="button"
            onclick={() => toggleAddBit(mod.bit)}
            class="p-3.5 rounded-lg border text-left flex items-start gap-3 transition-colors cursor-pointer {isChecked ? 'border-neutral-900 dark:border-neutral-100 bg-neutral-50 dark:bg-neutral-900/60' : 'border-neutral-200 dark:border-neutral-800 bg-[var(--bg-surface)]'}"
          >
            <div class="w-4 h-4 rounded border mt-0.5 flex items-center justify-center shrink-0 {isChecked ? 'bg-[var(--brand)] border-[var(--brand)] text-[var(--accent-fg)]' : 'border-neutral-300 dark:border-neutral-600'}">
              {#if isChecked}
                <Check class="w-3 h-3 stroke-[3]" />
              {/if}
            </div>
            <div class="flex-1">
              <div class="flex items-center gap-1.5">
                <mod.icon class="w-3.5 h-3.5 text-neutral-500" />
                <span class="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                  {mod.label}
                </span>
              </div>
              <p class="text-[11px] text-neutral-500 mt-1 leading-snug">
                {mod.description}
              </p>
            </div>
          </button>
        {/each}
      </div>
    </div>

    <div class="flex items-center justify-end gap-2 pt-4 border-t border-neutral-200 dark:border-neutral-800">
      <Button type="button" variant="secondary" onclick={() => (isAddModalOpen = false)}>
        Batal (Esc)
      </Button>
      <Button type="submit" variant="primary" loading={isSubmittingAdd}>
        <ShieldPlus class="w-3.5 h-3.5" />
        <span>Add Role (Enter)</span>
      </Button>
    </div>
  </form>
</Modal>

<!-- MODAL: View / Edit Role (Size Large: max-w-3xl) -->
<Modal
  bind:open={isEditModalOpen}
  title={editingRole?.id === 1 ? 'View & Edit Role: Administrator' : (editingRole ? `View & Edit Role: ${editingRole.name}` : 'View / Edit Role')}
  size="lg"
>
  {#if editingRole}
    {@const isAdministrator = editingRole.id === 1 || editingRole.name === 'Administrator'}
    <form novalidate onsubmit={handleEditRole} class="space-y-4">
      {#if editErrorMessage}
        <div class="p-3 rounded-md border border-red-500/30 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 text-xs flex items-start gap-2">
          <AlertCircle class="w-4 h-4 shrink-0 mt-0.5" />
          <span>{editErrorMessage}</span>
        </div>
      {/if}

      <!-- Role Name Input -->
      <Input
        id="edit-role-name"
        label="Role Name"
        bind:value={editRoleName}
        placeholder="Role Name"
        hint="Nama role dapat diubah jika diperlukan."
        autofocus
        error={editRoleNameError}
        oninput={() => {
          if (editRoleName.trim()) editRoleNameError = null;
        }}
        onblur={() => {
          if (!editRoleName.trim()) editRoleNameError = 'Nama role wajib diisi.';
        }}
        required
      >
        {#snippet prefix()}
          <Shield class="w-4 h-4 text-neutral-400" />
        {/snippet}
      </Input>

      <!-- Permissions Section -->
      <div class="space-y-2 pt-2">
        <div class="flex items-center justify-between border-t border-neutral-200 dark:border-neutral-800 pt-3">
          <span class="block text-xs font-semibold text-neutral-900 dark:text-neutral-100">
            Permissions
          </span>
          {#if isAdministrator}
            <Badge variant="warning" size="sm">
              <Lock class="w-3 h-3 mr-1" />
              Akses Penuh
            </Badge>
          {:else}
            <span class="text-[11px] font-mono text-neutral-500">
              {editSelectedBits.length} modul aktif
            </span>
          {/if}
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {#each MODULES as mod}
            {@const isChecked = isAdministrator || editSelectedBits.includes(mod.bit)}
            <button
              type="button"
              disabled={isAdministrator}
              onclick={() => toggleEditBit(mod.bit)}
              class="p-3.5 rounded-lg border text-left flex items-start gap-3 transition-colors {isAdministrator ? 'opacity-85 cursor-not-allowed border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-900/40' : 'cursor-pointer'} {isChecked && !isAdministrator ? 'border-neutral-900 dark:border-neutral-100 bg-neutral-50 dark:bg-neutral-900/60' : !isAdministrator ? 'border-neutral-200 dark:border-neutral-800 bg-[var(--bg-surface)]' : ''}"
            >
              <div class="w-4 h-4 rounded border mt-0.5 flex items-center justify-center shrink-0 {isChecked ? 'bg-[var(--brand)] border-[var(--brand)] text-[var(--accent-fg)]' : 'border-neutral-300 dark:border-neutral-600'}">
                {#if isChecked}
                  <Check class="w-3 h-3 stroke-[3]" />
                {/if}
              </div>
              <div class="flex-1">
                <div class="flex items-center gap-1.5">
                  <mod.icon class="w-3.5 h-3.5 text-neutral-500" />
                  <span class="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                    {mod.label}
                  </span>
                </div>
                <p class="text-[11px] text-neutral-500 mt-1 leading-snug">
                  {mod.description}
                </p>
              </div>
            </button>
          {/each}
        </div>
      </div>

      <!-- Users Assigned to this Role Section (matching uar_list from old kasirku) -->
      <div class="space-y-2 pt-2 border-t border-neutral-200 dark:border-neutral-800">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-2">
          <div>
            <div class="flex items-center gap-2">
              <Users class="w-4 h-4 text-neutral-500" />
              <span class="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                Users assigned to this role
              </span>
            </div>
            <p class="text-[11px] text-neutral-500 mt-0.5">
              Daftar pengguna yang saat ini terdaftar dengan permission role ini.
            </p>
          </div>

          {#if assignedUsers.length > 5}
            <div class="relative w-full sm:w-48">
              <Search class="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder="Cari user..."
                bind:value={assignedUserSearch}
                class="w-full pl-8 pr-3 py-1 text-xs rounded-md border border-neutral-200 dark:border-neutral-700 bg-[var(--bg-surface)] text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-[var(--brand)]"
              />
            </div>
          {/if}
        </div>

        <div class="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50/40 dark:bg-neutral-900/30 overflow-hidden">
          {#if loadingAssignedUsers}
            <div class="p-3 space-y-2">
              <Skeleton class="h-6 w-full" />
              <Skeleton class="h-6 w-full" />
            </div>
          {:else if assignedUsers.length === 0}
            <div class="py-6 px-4 text-center text-neutral-500">
              <User class="w-6 h-6 mx-auto text-neutral-400 opacity-60 mb-1" />
              <p class="text-xs font-medium text-neutral-600 dark:text-neutral-400">Belum ada pengguna dengan role ini</p>
              <p class="text-[11px] text-neutral-400 mt-0.5">Pengguna dapat ditugaskan ke role ini melalui menu Daftar Pengguna.</p>
            </div>
          {:else}
            <div class="max-h-48 overflow-y-auto divide-y divide-neutral-200/70 dark:divide-neutral-800/80">
              <table class="w-full text-xs border-collapse">
                <thead class="bg-neutral-100/70 dark:bg-neutral-800/60 text-neutral-500 uppercase font-mono text-[10px] font-semibold sticky top-0">
                  <tr>
                    <th class="py-2 px-3 text-left">Full Name (Username)</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-neutral-200/70 dark:divide-neutral-800/80">
                  {#if filteredAssignedUsers.length === 0}
                    <tr>
                      <td class="py-4 text-center text-neutral-400 text-xs">
                        Tidak ada pengguna yang cocok dengan pencarian.
                      </td>
                    </tr>
                  {:else}
                    {#each filteredAssignedUsers as u}
                      <tr class="hover:bg-neutral-100/50 dark:hover:bg-neutral-800/40 transition-colors">
                        <td class="py-2.5 px-3">
                          <div class="flex items-center gap-2.5">
                            <div class="w-6 h-6 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center font-bold text-[10px] text-neutral-700 dark:text-neutral-300 shrink-0">
                              {u.full_name.charAt(0).toUpperCase()}
                            </div>
                            <div class="flex items-center gap-1.5 flex-wrap">
                              <span class="font-medium text-neutral-900 dark:text-neutral-100">{u.full_name}</span>
                              <span class="text-neutral-400 font-mono text-[11px]">(@{u.username})</span>
                            </div>
                          </div>
                        </td>
                      </tr>
                    {/each}
                  {/if}
                </tbody>
              </table>
            </div>
          {/if}
        </div>
      </div>

      <div class="flex items-center justify-end gap-2 pt-4 border-t border-neutral-200 dark:border-neutral-800">
        <Button type="button" variant="secondary" onclick={() => (isEditModalOpen = false)}>
          Close (Esc)
        </Button>
        <Button type="submit" variant="primary" loading={isSubmittingEdit}>
          <Check class="w-3.5 h-3.5" />
          <span>Edit Role (Enter)</span>
        </Button>
      </div>
    </form>
  {/if}
</Modal>


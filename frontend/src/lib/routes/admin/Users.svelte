<svelte:head>
    <title>KasirKu | Users</title>
</svelte:head>

<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { api } from '../../api/api';
  import { auth } from '../../stores/auth.svelte';
  import { toast } from '../../stores/toast.svelte';
  import { confirmDialog } from '../../stores/dialog.svelte';
  import { sse } from '../../stores/sse.svelte';
  import Button from '../../components/ui/Button.svelte';
  import Input from '../../components/ui/Input.svelte';
  import Select from '../../components/ui/Select.svelte';
  import Modal from '../../components/ui/Modal.svelte';
  import Badge from '../../components/ui/Badge.svelte';
  import Skeleton from '../../components/ui/Skeleton.svelte';
  import TablePagination from '../../components/ui/TablePagination.svelte';
  import { formatDateTime } from '../../utils/format';
  import {
    Users,
    UserPlus,
    Search,
    Shield,
    KeyRound,
    Pencil,
    Trash2,
    RefreshCw,
    UserCheck,
    Lock,
    Eye,
    EyeOff,
    Check,
    AlertCircle,
    User,
    ShieldAlert,
    ShieldCheck,
    ArrowUpDown,
    ArrowUp,
    ArrowDown
  } from 'lucide-svelte';

  export interface UserItem {
    id: number;
    username: string;
    full_name: string;
    role_id: number;
    profile_img: string | null;
    created_ms: number;
    modified_ms: number;
  }

  export interface RoleItem {
    id: number;
    name: string;
    permission_level: number;
    created_ms?: number;
    modified_ms?: number;
  }

  let userList = $state<UserItem[]>([]);
  let roleList = $state<RoleItem[]>([]);
  let loading = $state(true);
  let searchQuery = $state('');
  let selectedRoleFilter = $state<number | 'all'>('all');

  // Modal: Add User
  let isAddModalOpen = $state(false);
  let formUsername = $state('');
  let formFullName = $state('');
  let formPassword = $state('');
  let formRoleId = $state<number | null>(null);
  let showPassword = $state(false);
  let isSubmittingAdd = $state(false);
  let addErrorMessage = $state<string | null>(null);

  // Modal: Edit User
  let isEditModalOpen = $state(false);
  let editingUser = $state<UserItem | null>(null);
  let editUsername = $state('');
  let editFullName = $state('');
  let editRoleId = $state<number | null>(null);
  let editNewPassword = $state('');
  let showEditPassword = $state(false);
  let isSubmittingEdit = $state(false);
  let editErrorMessage = $state<string | null>(null);

  // Sorting
  let sortField = $state<'id' | 'username' | 'full_name' | 'role_id' | 'created_ms'>('id');
  let sortAsc = $state(true);

  const roleMap = $derived(() => {
    const map = new Map<number, RoleItem>();
    for (const r of roleList) {
      map.set(r.id, r);
    }
    return map;
  });

  async function fetchData() {
    loading = true;
    try {
      const [usersRes, rolesRes] = await Promise.all([
        api.get<UserItem[]>('/api/users'),
        api.get<RoleItem[]>('/api/roles'),
      ]);

      userList = Array.isArray(usersRes) ? usersRes : [];
      roleList = Array.isArray(rolesRes) ? rolesRes : [];

      if (!formRoleId && roleList.length > 0) {
        // Default to first non-admin role if possible
        const staffRole = roleList.find(r => r.id !== 1) || roleList[0];
        formRoleId = staffRole.id;
      }
    } catch (err: any) {
      toast.error('Gagal memuat data pengguna: ' + (err.message || ''));
    } finally {
      loading = false;
    }
  }

  // Field error states
  let usernameError = $state<string | null>(null);
  let fullNameError = $state<string | null>(null);
  let passwordError = $state<string | null>(null);
  let roleError = $state<string | null>(null);
  let editUsernameError = $state<string | null>(null);
  let editFullNameError = $state<string | null>(null);
  let editPasswordError = $state<string | null>(null);
  let editRoleError = $state<string | null>(null);

  function openAddModal() {
    formUsername = '';
    formFullName = '';
    formPassword = '';
    showPassword = false;
    addErrorMessage = null;
    usernameError = null;
    fullNameError = null;
    passwordError = null;
    roleError = null;
    if (roleList.length > 0) {
      const staffRole = roleList.find(r => r.id !== 1) || roleList[0];
      formRoleId = staffRole.id;
    }
    isAddModalOpen = true;
  }

  async function handleAddUser(e: Event) {
    e.preventDefault();
    addErrorMessage = null;
    usernameError = null;
    fullNameError = null;
    passwordError = null;
    roleError = null;

    const u = formUsername.trim().toLowerCase();
    const fn = formFullName.trim();
    const p = formPassword;

    let hasError = false;

    if (!u) {
      usernameError = 'Username wajib diisi.';
      hasError = true;
    } else if (!/^[a-z0-9_]+$/.test(u)) {
      usernameError = 'Username hanya boleh huruf kecil (a-z), angka (0-9), dan garis bawah (_).';
      hasError = true;
    }

    if (!fn) {
      fullNameError = 'Nama lengkap wajib diisi.';
      hasError = true;
    }

    if (!p) {
      passwordError = 'Kata sandi wajib diisi.';
      hasError = true;
    } else if (p.length < 8) {
      passwordError = 'Kata sandi minimal harus 8 karakter.';
      hasError = true;
    }

    if (!formRoleId) {
      roleError = 'Pilih hak akses (role) untuk pengguna ini.';
      hasError = true;
    }

    if (hasError) return;

    isSubmittingAdd = true;
    try {
      const params = new URLSearchParams({
        username: u,
        full_name: fn,
        password: p,
        role_id: String(formRoleId),
      });

      await api.post('/api/user', params);
      toast.success(`Pengguna @${u} berhasil ditambahkan.`);
      isAddModalOpen = false;
      fetchData();
    } catch (err: any) {
      if (err.status === 403 && err.message === '1') {
        usernameError = 'Username tersebut sudah terdaftar. Gunakan username lain.';
      } else if (err.status === 403 && err.message === '0') {
        addErrorMessage = 'Anda tidak memiliki hak akses Administrator.';
      } else {
        addErrorMessage = err.message || 'Gagal menambahkan pengguna.';
      }
    } finally {
      isSubmittingAdd = false;
    }
  }

  function openEditModal(user: UserItem) {
    editingUser = user;
    editUsername = user.username;
    editFullName = user.full_name;
    editRoleId = user.role_id;
    editNewPassword = '';
    showEditPassword = false;
    editErrorMessage = null;
    editUsernameError = null;
    editFullNameError = null;
    editPasswordError = null;
    editRoleError = null;
    isEditModalOpen = true;
  }

  async function handleEditUser(e: Event) {
    e.preventDefault();
    if (!editingUser) return;
    editErrorMessage = null;
    editUsernameError = null;
    editFullNameError = null;
    editPasswordError = null;
    editRoleError = null;

    const u = editUsername.trim().toLowerCase();
    const fn = editFullName.trim();
    const p = editNewPassword;

    let hasError = false;

    if (!u) {
      editUsernameError = 'Username wajib diisi.';
      hasError = true;
    } else if (!/^[a-z0-9_]+$/.test(u)) {
      editUsernameError = 'Username hanya boleh huruf kecil (a-z), angka (0-9), dan garis bawah (_).';
      hasError = true;
    }

    if (!fn) {
      editFullNameError = 'Nama lengkap wajib diisi.';
      hasError = true;
    }

    if (p && p.length < 8) {
      editPasswordError = 'Kata sandi baru minimal harus 8 karakter.';
      hasError = true;
    }

    if (!editRoleId) {
      editRoleError = 'Pilih hak akses (role) pengguna.';
      hasError = true;
    }

    if (hasError) return;

    isSubmittingEdit = true;
    try {
      const params = new URLSearchParams({
        id: String(editingUser.id),
        new_username: u,
        new_full_name: fn,
        new_role_id: String(editRoleId),
      });

      if (p) {
        params.append('new_password', p);
      }

      await api.patch('/api/user', params);
      toast.success(`Data pengguna @${u} berhasil diperbarui.`);
      isEditModalOpen = false;
      fetchData();
    } catch (err: any) {
      if (err.status === 403 && err.message === '1') {
        editErrorMessage = 'Anda tidak dapat mengedit akun Anda sendiri melalui menu ini. Silakan perbarui profil di menu Profil.';
      } else if (err.status === 403 && err.message === '2') {
        editErrorMessage = 'Akun Administrator default (ID 1) diproteksi dan tidak dapat diubah di sini.';
      } else if (err.status === 403 && err.message === '3') {
        editErrorMessage = 'Username tersebut sudah terpakai oleh pengguna lain.';
      } else {
        editErrorMessage = err.message || 'Gagal memperbarui data pengguna.';
      }
    } finally {
      isSubmittingEdit = false;
    }
  }

  async function handleDeleteUser(user: UserItem) {
    if (user.id === 1) {
      toast.error('Akun Administrator utama (ID 1) tidak dapat dihapus.');
      return;
    }

    if (user.id === auth.user?.id) {
      toast.error('Anda tidak dapat menghapus akun Anda sendiri.');
      return;
    }

    const confirmed = await confirmDialog({
      title: 'Hapus Akun Pengguna?',
      message: `Apakah Anda yakin ingin menghapus pengguna "${user.full_name}" (@${user.username})? Sesi login pengguna ini akan dicabut seketika dan data tidak dapat dipulihkan.`,
      confirmText: 'Ya, Hapus Pengguna',
      cancelText: 'Batal',
      variant: 'danger',
    });

    if (!confirmed) return;

    try {
      const params = new URLSearchParams({
        id: String(user.id),
      });

      await api.delete('/api/user', params);
      toast.success(`Pengguna @${user.username} berhasil dihapus.`);
      fetchData();
    } catch (err: any) {
      toast.error('Gagal menghapus pengguna: ' + (err.message || ''));
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

  // Filtered and Sorted Users
  let filteredUsers = $derived.by(() => {
    let list = [...userList];

    if (selectedRoleFilter !== 'all') {
      list = list.filter(u => u.role_id === selectedRoleFilter);
    }

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(u =>
        u.username.toLowerCase().includes(q) ||
        u.full_name.toLowerCase().includes(q) ||
        String(u.id).includes(q)
      );
    }

    list.sort((a, b) => {
      let va = a[sortField] ?? 0;
      let vb = b[sortField] ?? 0;
      if (typeof va === 'string') va = (va as string).toLowerCase();
      if (typeof vb === 'string') vb = (vb as string).toLowerCase();
      if (va < vb) return sortAsc ? -1 : 1;
      if (va > vb) return sortAsc ? 1 : -1;
      return 0;
    });

    return list;
  });

  // KPI Metrics
  const totalUsers = $derived(userList.length);
  const totalAdmins = $derived(userList.filter(u => u.role_id === 1).length);
  const totalStaff = $derived(userList.filter(u => u.role_id !== 1).length);

  // Pagination
  let currentPage = $state(1);
  let pageSize = $state(10);
  const paginatedUsers = $derived(
    filteredUsers.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  );
  const totalPages = $derived(Math.ceil(filteredUsers.length / pageSize) || 1);

  $effect(() => {
    void searchQuery;
    void selectedRoleFilter;
    currentPage = 1;
  });

  // SSE Unsubscribe handler
  let sseUnsub: (() => void) | null = null;

  onMount(() => {
    fetchData();
    sseUnsub = sse.subscribe((event) => {
      if (event?.code === 'REFRESH_USERS') {
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
      <h1 class="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
        Users
      </h1>
      <span class="text-xs font-mono px-2 py-0.5 rounded border border-neutral-200 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400">
        {totalUsers} Pengguna
      </span>
    </div>

    <div class="flex items-center gap-2 shrink-0">
      <Button variant="secondary" size="sm" onclick={fetchData} loading={loading} title="Segarkan Data">
        <RefreshCw class="w-3.5 h-3.5" />
        <span class="hidden sm:inline">Refresh</span>
      </Button>
      <Button variant="primary" size="sm" onclick={openAddModal}>
        <UserPlus class="w-3.5 h-3.5" />
        <span>Tambah Pengguna</span>
      </Button>
    </div>
  </div>

  <!-- Search & Role Filter Bar -->
  <div class="flex flex-col sm:flex-row justify-between gap-3">
    <div class="relative flex-1 max-w-md">
      <Search class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
      <input
        type="text"
        placeholder="Cari berdasarkan nama, username, atau ID..."
        bind:value={searchQuery}
        class="w-full pl-9 pr-4 py-2 text-xs rounded-md border border-neutral-200 dark:border-neutral-700 bg-[var(--bg-surface)] text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-[var(--brand)]/50 focus:border-[var(--brand)] transition-colors shadow-2xs"
      />
    </div>
    <div class="flex items-center gap-2">
      <span class="text-xs text-neutral-500 shrink-0 font-medium">Filter Role:</span>
      <Select
        bind:value={selectedRoleFilter}
        class="w-auto min-w-[170px]"
        selectClass="h-9 text-xs"
      >
        <option value="all">Semua Role ({totalUsers})</option>
        {#each roleList as role}
          <option value={role.id}>
            {role.name} ({userList.filter(u => u.role_id === role.id).length})
          </option>
        {/each}
      </Select>
    </div>
  </div>

  <!-- Users Table -->
  <div class="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-[var(--bg-surface)] overflow-hidden shadow-2xs">
    <div class="overflow-x-auto">
      <table class="w-full text-xs border-collapse">
        <thead class="bg-neutral-50/70 dark:bg-neutral-900/50 border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 uppercase font-mono text-[10px] font-semibold tracking-wider text-center">
          <tr>
            <th class="py-2.5 px-3 text-center w-20">
              <button
                type="button"
                onclick={() => toggleSort('id')}
                class="inline-flex items-center justify-center gap-1 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors uppercase font-mono text-[10px] tracking-wider mx-auto"
              >
                <span>ID</span>
                {#if sortField === 'id'}
                  {#if sortAsc}
                    <ArrowUp class="w-3 h-3 text-neutral-900 dark:text-neutral-100" />
                  {:else}
                    <ArrowDown class="w-3 h-3 text-neutral-900 dark:text-neutral-100" />
                  {/if}
                {:else}
                  <ArrowUpDown class="w-3 h-3 opacity-40" />
                {/if}
              </button>
            </th>
            <th class="py-2.5 px-3 text-center">
              <button
                type="button"
                onclick={() => toggleSort('full_name')}
                class="inline-flex items-center justify-center gap-1 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors uppercase font-mono text-[10px] tracking-wider mx-auto"
              >
                <span>Pengguna / Kredensial</span>
                {#if sortField === 'full_name'}
                  {#if sortAsc}
                    <ArrowUp class="w-3 h-3 text-neutral-900 dark:text-neutral-100" />
                  {:else}
                    <ArrowDown class="w-3 h-3 text-neutral-900 dark:text-neutral-100" />
                  {/if}
                {:else}
                  <ArrowUpDown class="w-3 h-3 opacity-40" />
                {/if}
              </button>
            </th>
            <th class="py-2.5 px-3 text-center">
              <button
                type="button"
                onclick={() => toggleSort('role_id')}
                class="inline-flex items-center justify-center gap-1 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors uppercase font-mono text-[10px] tracking-wider mx-auto"
              >
                <span>Role</span>
                {#if sortField === 'role_id'}
                  {#if sortAsc}
                    <ArrowUp class="w-3 h-3 text-neutral-900 dark:text-neutral-100" />
                  {:else}
                    <ArrowDown class="w-3 h-3 text-neutral-900 dark:text-neutral-100" />
                  {/if}
                {:else}
                  <ArrowUpDown class="w-3 h-3 opacity-40" />
                {/if}
              </button>
            </th>
            <th class="py-2.5 px-3 text-center">
              <button
                type="button"
                onclick={() => toggleSort('created_ms')}
                class="inline-flex items-center justify-center gap-1 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors uppercase font-mono text-[10px] tracking-wider mx-auto"
              >
                <span>Didaftarkan</span>
                {#if sortField === 'created_ms'}
                  {#if sortAsc}
                    <ArrowUp class="w-3 h-3 text-neutral-900 dark:text-neutral-100" />
                  {:else}
                    <ArrowDown class="w-3 h-3 text-neutral-900 dark:text-neutral-100" />
                  {/if}
                {:else}
                  <ArrowUpDown class="w-3 h-3 opacity-40" />
                {/if}
              </button>
            </th>
            <th class="py-2.5 px-3 text-center w-28">
              Aksi
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-neutral-200/70 dark:divide-neutral-800/80">
          {#if loading}
            {#each Array(4) as _}
              <tr>
                <td class="py-2.5 px-3 text-center"><Skeleton class="h-4 w-8 mx-auto" /></td>
                <td class="py-2.5 px-3"><Skeleton class="h-4 w-48" /></td>
                <td class="py-2.5 px-3 text-center"><Skeleton class="h-4 w-24 mx-auto" /></td>
                <td class="py-2.5 px-3 text-center"><Skeleton class="h-4 w-32 mx-auto" /></td>
                <td class="py-2.5 px-3 text-center"><Skeleton class="h-7 w-20 mx-auto" /></td>
              </tr>
            {/each}
          {:else if paginatedUsers.length === 0}
            <tr>
              <td colspan="5" class="py-12 text-center text-neutral-500">
                <div class="flex flex-col items-center justify-center gap-2">
                  <Users class="w-8 h-8 text-neutral-400 opacity-60" />
                  <p class="font-medium text-xs">Tidak ada data pengguna ditemukan.</p>
                  {#if searchQuery || selectedRoleFilter !== 'all'}
                    <button
                      type="button"
                      onclick={() => { searchQuery = ''; selectedRoleFilter = 'all'; }}
                      class="text-xs text-neutral-900 dark:text-neutral-100 underline hover:opacity-80 mt-1"
                    >
                      Reset filter pencarian
                    </button>
                  {/if}
                </div>
              </td>
            </tr>
          {:else}
            {#each paginatedUsers as user (user.id)}
              {@const isSelf = user.id === auth.user?.id}
              {@const roleObj = roleMap().get(user.role_id)}
              <tr class="hover:bg-neutral-50/70 dark:hover:bg-neutral-900/40 transition-colors">
                <!-- ID (Centered) -->
                <td class="py-2.5 px-3 text-center font-medium text-neutral-500 tabular-nums">
                  #{user.id}
                </td>

                <!-- User Name & Avatar -->
                <td class="py-2.5 px-3 text-center">
                  <div class="flex items-center justify-center gap-2.5">
                    <div class="w-7 h-7 rounded-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center font-bold text-xs text-neutral-700 dark:text-neutral-300 shrink-0">
                      {user.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div class="flex items-center gap-1.5">
                        <span class="font-medium text-neutral-900 dark:text-neutral-100">
                          {user.full_name}
                        </span>
                        {#if isSelf}
                          <Badge variant="success" size="sm">Akun Anda</Badge>
                        {/if}
                      </div>
                      <span class="text-[10px] text-neutral-400">
                        @{user.username}
                      </span>
                    </div>
                  </div>
                </td>

                <!-- Role (Centered) -->
                <td class="py-2.5 px-3 text-center">
                  <div class="inline-flex items-center justify-center gap-1.5 px-2.5 py-0.5 rounded-full border border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/40 text-[11px]">
                    <Shield class="w-3 h-3 {user.role_id === 1 ? 'text-amber-500' : 'text-neutral-400'}" />
                    <span class="font-medium text-neutral-800 dark:text-neutral-200">
                      {roleObj?.name || `Role #${user.role_id}`}
                    </span>
                  </div>
                </td>

                <!-- Created Date (Centered) -->
                <td class="py-2.5 px-3 text-center tabular-nums text-neutral-500 text-[11px]">
                  {formatDateTime(user.created_ms)}
                </td>

                <!-- Actions (Centered) -->
                <td class="py-2.5 px-3 text-center">
                  <div class="flex items-center justify-center gap-1.5">
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={isSelf}
                      onclick={() => openEditModal(user)}
                      title={isSelf ? 'Gunakan menu Profil untuk mengubah akun Anda' : 'Edit User'}
                    >
                      <Pencil class="w-3 h-3" />
                      <span class="hidden sm:inline">Edit</span>
                    </Button>

                    <Button
                      variant="danger"
                      size="sm"
                      disabled={isSelf}
                      onclick={() => handleDeleteUser(user)}
                      title={isSelf ? 'Anda tidak dapat menghapus akun Anda sendiri' : 'Hapus Pengguna'}
                    >
                      <Trash2 class="w-3 h-3" />
                      <span class="hidden sm:inline">Hapus</span>
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
      totalItems={filteredUsers.length}
      currentItemsCount={paginatedUsers.length}
      itemLabel="pengguna"
      storageKey="users_limit"
    />
  </div>
</div>

<!-- MODAL: Tambah Pengguna (Size Large: max-w-3xl) -->
<Modal bind:open={isAddModalOpen} title="Tambah Pengguna Baru" size="lg">
  <form novalidate onsubmit={handleAddUser} class="space-y-4">
    {#if addErrorMessage}
      <div class="p-3 rounded-md border border-red-500/30 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 text-xs flex items-start gap-2">
        <AlertCircle class="w-4 h-4 shrink-0 mt-0.5" />
        <span>{addErrorMessage}</span>
      </div>
    {/if}

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Input
        id="user-username"
        label="Username"
        bind:value={formUsername}
        placeholder="contoh: kasir_sore"
        hint="Huruf kecil (a-z), angka (0-9), garis bawah (_)."
        required
        error={usernameError}
        oninput={() => {
          if (formUsername.trim()) usernameError = null;
        }}
        onblur={() => {
          if (!formUsername.trim()) usernameError = 'Username wajib diisi.';
        }}
      >
        {#snippet prefix()}
          <span class="text-neutral-400 font-mono text-xs">@</span>
        {/snippet}
      </Input>

      <Input
        id="user-fullname"
        label="Nama Lengkap"
        bind:value={formFullName}
        placeholder="Nama Lengkap Kasir / Staf"
        required
        error={fullNameError}
        oninput={() => {
          if (formFullName.trim()) fullNameError = null;
        }}
        onblur={() => {
          if (!formFullName.trim()) fullNameError = 'Nama lengkap wajib diisi.';
        }}
      >
        {#snippet prefix()}
          <User class="w-4 h-4 text-neutral-400" />
        {/snippet}
      </Input>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <!-- Role Selection -->
      <div>
        <Select
          id="user-role"
          label="Hak Akses (Role)"
          bind:value={formRoleId}
          required
          error={roleError}
          onchange={() => (roleError = null)}
          hint="Menentukan modul yang dapat diakses pengguna ini."
        >
          {#each roleList as role}
            <option value={role.id}>
              {role.name} {role.id === 1 ? '(Full Administrator)' : ''}
            </option>
          {/each}
        </Select>
      </div>

      <!-- Password Input -->
      <div>
        <Input
          id="user-password"
          label="Kata Sandi"
          type={showPassword ? 'text' : 'password'}
          bind:value={formPassword}
          placeholder="Minimal 8 karakter"
          required
          error={passwordError}
          oninput={() => {
            if (formPassword) passwordError = null;
          }}
          onblur={() => {
            if (!formPassword) passwordError = 'Kata sandi wajib diisi.';
            else if (formPassword.length < 8) passwordError = 'Kata sandi minimal harus 8 karakter.';
          }}
          hint="Gunakan kombinasi kata sandi yang aman."
        >
          {#snippet prefix()}
            <KeyRound class="w-4 h-4 text-neutral-400" />
          {/snippet}
          {#snippet suffix()}
            <button
              type="button"
              onclick={() => (showPassword = !showPassword)}
              class="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              tabindex="-1"
              aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
            >
              {#if showPassword}
                <EyeOff class="w-3.5 h-3.5" />
              {:else}
                <Eye class="w-3.5 h-3.5" />
              {/if}
            </button>
          {/snippet}
        </Input>
      </div>
    </div>

    <div class="flex items-center justify-end gap-2 pt-4 border-t border-neutral-200 dark:border-neutral-800">
      <Button type="button" variant="secondary" onclick={() => (isAddModalOpen = false)}>
        Batal
      </Button>
      <Button type="submit" variant="primary" loading={isSubmittingAdd}>
        <UserPlus class="w-3.5 h-3.5" />
        <span>Daftarkan Pengguna</span>
      </Button>
    </div>
  </form>
</Modal>

<!-- MODAL: Edit Pengguna (Size Large: max-w-3xl) -->
<Modal bind:open={isEditModalOpen} title="Ubah Data Pengguna" size="lg">
  {#if editingUser}
    <form novalidate onsubmit={handleEditUser} class="space-y-4">
      {#if editErrorMessage}
        <div class="p-3 rounded-md border border-red-500/30 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 text-xs flex items-start gap-2">
          <AlertCircle class="w-4 h-4 shrink-0 mt-0.5" />
          <span>{editErrorMessage}</span>
        </div>
      {/if}

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          id="edit-username"
          label="Username"
          bind:value={editUsername}
          placeholder="username"
          hint="Huruf kecil (a-z), angka (0-9), garis bawah (_)."
          required
          error={editUsernameError}
          oninput={() => {
            if (editUsername.trim()) editUsernameError = null;
          }}
          onblur={() => {
            if (!editUsername.trim()) editUsernameError = 'Username wajib diisi.';
          }}
        >
          {#snippet prefix()}
            <span class="text-neutral-400 font-mono text-xs">@</span>
          {/snippet}
        </Input>

        <Input
          id="edit-fullname"
          label="Nama Lengkap"
          bind:value={editFullName}
          placeholder="Nama Lengkap Pengguna"
          required
          error={editFullNameError}
          oninput={() => {
            if (editFullName.trim()) editFullNameError = null;
          }}
          onblur={() => {
            if (!editFullName.trim()) editFullNameError = 'Nama lengkap wajib diisi.';
          }}
        >
          {#snippet prefix()}
            <User class="w-4 h-4 text-neutral-400" />
          {/snippet}
        </Input>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <!-- Role Selection -->
        <div>
          <Select
            id="edit-role"
            label="Hak Akses (Role)"
            bind:value={editRoleId}
            required
            error={editRoleError}
            onchange={() => (editRoleError = null)}
            hint="Pilih role untuk mengatur izin akses modul."
          >
            {#each roleList as role}
              <option value={role.id}>
                {role.name} {role.id === 1 ? '(Full Administrator)' : ''}
              </option>
            {/each}
          </Select>
        </div>

        <!-- Optional New Password -->
        <div>
          <Input
            id="edit-password"
            label="Kata Sandi Baru (Opsional)"
            type={showEditPassword ? 'text' : 'password'}
            bind:value={editNewPassword}
            placeholder="Kosongkan jika tidak diubah"
            error={editPasswordError}
            oninput={() => {
              if (editNewPassword) editPasswordError = null;
            }}
            onblur={() => {
              if (editNewPassword && editNewPassword.length < 8) editPasswordError = 'Kata sandi minimal harus 8 karakter.';
            }}
            hint="Isi hanya jika ingin mereset kata sandi pengguna ini."
          >
            {#snippet prefix()}
              <KeyRound class="w-4 h-4 text-neutral-400" />
            {/snippet}
            {#snippet suffix()}
              <button
                type="button"
                onclick={() => (showEditPassword = !showEditPassword)}
                class="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                tabindex="-1"
                aria-label={showEditPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
              >
                {#if showEditPassword}
                  <EyeOff class="w-3.5 h-3.5" />
                {:else}
                  <Eye class="w-3.5 h-3.5" />
                {/if}
              </button>
            {/snippet}
          </Input>
        </div>
      </div>

      <div class="flex items-center justify-end gap-2 pt-4 border-t border-neutral-200 dark:border-neutral-800">
        <Button type="button" variant="secondary" onclick={() => (isEditModalOpen = false)}>
          Batal
        </Button>
        <Button type="submit" variant="primary" loading={isSubmittingEdit}>
          <Check class="w-3.5 h-3.5" />
          <span>Simpan Perubahan</span>
        </Button>
      </div>
    </form>
  {/if}
</Modal>

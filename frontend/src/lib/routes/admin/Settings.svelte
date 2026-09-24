<svelte:head>
  <title>KasirKu | Settings</title>
</svelte:head>

<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { fly } from 'svelte/transition';
  import { api } from '../../api/api';
  import { toast } from '../../stores/toast.svelte';
  import { sse } from '../../stores/sse.svelte';
  import Button from '../../components/ui/Button.svelte';
  import Input from '../../components/ui/Input.svelte';
  import Card from '../../components/ui/Card.svelte';
  import Badge from '../../components/ui/Badge.svelte';
  import Skeleton from '../../components/ui/Skeleton.svelte';
  import CodeEditor from '../../components/ui/CodeEditor.svelte';
  import Modal from '../../components/ui/Modal.svelte';
  import {
    renderReceiptHtml,
    RECEIPT_PRESETS,
    TEMPLATE_VARIABLES,
    type StoreInfo
  } from '../../utils/receipt';
  import { formatRupiah, formatDateTime } from '../../utils/format';
  import {
    Settings,
    Store,
    Receipt,
    Phone,
    MapPin,
    FileText,
    Save,
    RefreshCw,
    CheckCircle2,
    AlertCircle,
    AlertTriangle,
    Eye,
    Printer,
    Sparkles,
    Code2,
    Copy,
    RotateCcw,
    Search,
    FileCode,
    Loader2
  } from 'lucide-svelte';

  export interface StoreSettings {
    id: number;
    name: string | null;
    desc: string | null;
    address: string | null;
    phone_num: string | null;
  }

  export interface StrukSettings {
    enabled?: boolean | string | null;
    content?: string | null;
    store_struk?: string | null;
    value?: string | null;
  }

  let loading = $state(true);
  let activeTab = $state<'toko' | 'struk'>('toko');

  // Store form state
  let namaToko = $state('');
  let initialNamaToko = $state('');
  let deskripsiToko = $state('');
  let initialDeskripsiToko = $state('');
  let alamatToko = $state('');
  let initialAlamatToko = $state('');
  let teleponToko = $state('');
  let initialTeleponToko = $state('');
  let isSavingStore = $state(false);
  let storeErrorMessage = $state<string | null>(null);
  let namaTokoError = $state<string | null>(null);
  let teleponTokoError = $state<string | null>(null);

  const isStoreChanged = $derived(
    namaToko !== initialNamaToko ||
    deskripsiToko !== initialDeskripsiToko ||
    alamatToko !== initialAlamatToko ||
    teleponToko !== initialTeleponToko
  );

  // Struk HTML form state
  let isStrukEnabled = $state(true);
  let initialStrukEnabled = $state(true);
  let strukContent = $state('');
  let initialStrukContent = $state('');
  let isSavingStruk = $state(false);
  let strukErrorMessage = $state<string | null>(null);
  let previewWidth = $state<'58mm' | '80mm'>('58mm');
  let copiedVariable = $state<string | null>(null);

  const isStrukChanged = $derived(
    strukContent !== initialStrukContent ||
    isStrukEnabled !== initialStrukEnabled
  );

  const hasUnsavedChanges = $derived(isStoreChanged || isStrukChanged);

  // Variable modal dialog state
  let showVariableModal = $state(false);
  let variableSearchQuery = $state('');
  let selectedCategory = $state<'all' | 'toko' | 'transaksi' | 'produk' | 'pembayaran'>('all');

  const filteredVariables = $derived(
    TEMPLATE_VARIABLES.filter((v) => {
      const matchCategory = selectedCategory === 'all' || v.category === selectedCategory;
      const matchQuery =
        !variableSearchQuery.trim() ||
        v.key.toLowerCase().includes(variableSearchQuery.toLowerCase()) ||
        v.label.toLowerCase().includes(variableSearchQuery.toLowerCase()) ||
        v.example.toLowerCase().includes(variableSearchQuery.toLowerCase());
      return matchCategory && matchQuery;
    })
  );

  // Sample data for real-time live preview
  const sampleStoreInfo = $derived<StoreInfo>({
    name: namaToko.trim() || 'EXMAPLE MART',
    desc: deskripsiToko.trim() || 'Sahabat Belanja Hemat & Terpercaya',
    address: alamatToko.trim() || 'Jl. Merdeka Raya No. 88, Bandung',
    phone_num: teleponToko.trim() || '(022) 1234-5678'
  });

  const sampleReceiptData = {
    receiptNo: 'SM-20260719-004281',
    timestamp: Date.now(),
    cashierName: 'Kasir Utama',
    totalItems: 7,
    totalAmount: 17200000,
    cashPaid: 20000000,
    changeAmount: 2800000,
    items: [
      { nama_barang: 'Indomie Goreng Rasa Ayam Geprek Sambal Korek Pedas Nampol Limited Edition', harga_jual: 350000, jumlah_barang: 2 },
      { nama_barang: 'Beras Ramos Super 5kg Kemasan Karung Premium', harga_jual: 6750000, jumlah_barang: 1 },
      { nama_barang: 'Minyak Goreng Bimoli 2 Liter Pouch', harga_jual: 3600000, jumlah_barang: 1 },
      { nama_barang: 'Telur Ayam Segar 1kg', harga_jual: 2800000, jumlah_barang: 1 },
      { nama_barang: 'Kopi Kapal Api Special Mix 10s', harga_jual: 1650000, jumlah_barang: 1 },
      { nama_barang: 'Roti Tawar Gandum Sari', harga_jual: 1400000, jumlah_barang: 1 },
      { nama_barang: 'Sabun Cair Lifebuoy 450ml', harga_jual: 650000, jumlah_barang: 1 }
    ]
  };

  const renderedPreviewHtml = $derived(
    renderReceiptHtml(strukContent, sampleReceiptData, sampleStoreInfo)
  );

  async function fetchData(silent = false) {
    if (!silent) loading = true;
    try {
      const [storeRes, strukRes] = await Promise.all([
        api.get<StoreSettings>('/api/settings/toko'),
        api.get<StrukSettings>('/api/settings/struk'),
      ]);

      if (storeRes) {
        const n = storeRes.name || '';
        const d = storeRes.desc || '';
        const a = storeRes.address || '';
        const p = storeRes.phone_num || '';
        namaToko = n;
        initialNamaToko = n;
        deskripsiToko = d;
        initialDeskripsiToko = d;
        alamatToko = a;
        initialAlamatToko = a;
        teleponToko = p;
        initialTeleponToko = p;
      }

      if (strukRes) {
        const rawEnabled = strukRes.enabled;
        const isEnabled = rawEnabled === undefined || rawEnabled === null
          ? true
          : String(rawEnabled).toLowerCase() === 'true' || String(rawEnabled) === '1';
        isStrukEnabled = isEnabled;
        initialStrukEnabled = isEnabled;

        const rawContent = strukRes.content ?? strukRes.store_struk ?? strukRes.value ?? '';
        const loaded = rawContent.trim() ? rawContent : RECEIPT_PRESETS[0].template;
        strukContent = loaded;
        initialStrukContent = loaded;
      } else {
        isStrukEnabled = true;
        initialStrukEnabled = true;
        strukContent = RECEIPT_PRESETS[0].template;
        initialStrukContent = RECEIPT_PRESETS[0].template;
      }
    } catch (err: any) {
      toast.error('Gagal memuat pengaturan: ' + (err.message || ''));
    } finally {
      if (!silent) loading = false;
    }
  }

  async function handleSaveStore(): Promise<boolean> {
    storeErrorMessage = null;
    namaTokoError = null;
    teleponTokoError = null;

    let hasError = false;

    const name = namaToko.trim();
    if (!name) {
      namaTokoError = 'Nama toko wajib diisi.';
      hasError = true;
    }

    const phone = teleponToko.trim();
    if (phone && !/^[0-9+\-\s()]+$/.test(phone)) {
      teleponTokoError = 'Format nomor telepon tidak valid. Gunakan angka dan tanda tambah/minus saja.';
      hasError = true;
    }

    if (hasError) return false;

    isSavingStore = true;
    try {
      const params = new URLSearchParams({
        nama_toko: name,
        deskripsi_toko: deskripsiToko.trim(),
        alamat_toko: alamatToko.trim(),
        telepon_toko: phone,
      });

      await api.patch('/api/settings/toko', params);
      await auth.fetchPublicInfo();
      initialNamaToko = name;
      initialDeskripsiToko = deskripsiToko.trim();
      initialAlamatToko = alamatToko.trim();
      initialTeleponToko = phone;
      return true;
    } catch (err: any) {
      storeErrorMessage = err.message || 'Gagal menyimpan pengaturan toko.';
      toast.error(storeErrorMessage);
      return false;
    } finally {
      isSavingStore = false;
    }
  }

  async function handleSaveStruk(): Promise<boolean> {
    strukErrorMessage = null;
    isSavingStruk = true;
    try {
      await api.patch('/api/settings/struk', {
        enabled: isStrukEnabled,
        content: strukContent || RECEIPT_PRESETS[0].template,
      });
      initialStrukContent = strukContent;
      initialStrukEnabled = isStrukEnabled;
      return true;
    } catch (err: any) {
      strukErrorMessage = err.message || 'Gagal menyimpan format struk.';
      toast.error(strukErrorMessage);
      return false;
    } finally {
      isSavingStruk = false;
    }
  }

  async function handleSaveAll() {
    if (isSavingStore || isSavingStruk) return;

    if (isStoreChanged) {
      const ok = await handleSaveStore();
      if (!ok) {
        if (activeTab !== 'toko') activeTab = 'toko';
        return;
      }
    }

    if (isStrukChanged) {
      await handleSaveStruk();
    }
  }

  function handleResetAll() {
    if (isStoreChanged) {
      namaToko = initialNamaToko;
      deskripsiToko = initialDeskripsiToko;
      alamatToko = initialAlamatToko;
      teleponToko = initialTeleponToko;
      namaTokoError = null;
      teleponTokoError = null;
      storeErrorMessage = null;
    }
    if (isStrukChanged) {
      strukContent = initialStrukContent;
      isStrukEnabled = initialStrukEnabled;
      strukErrorMessage = null;
    }
  }

  function applyPreset(template: string) {
    strukContent = template;
  }

  function copyVariable(key: string) {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(key);
      copiedVariable = key;
      setTimeout(() => {
        if (copiedVariable === key) copiedVariable = null;
      }, 2000);
      toast.success(`Variabel tersebut disalin ke clipboard!`);
    }
  }

  function handleTestPrint() {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(renderedPreviewHtml);
      doc.close();
      iframe.contentWindow?.focus();
      setTimeout(() => {
        iframe.contentWindow?.print();
        setTimeout(() => {
          if (iframe.parentNode) {
            iframe.parentNode.removeChild(iframe);
          }
        }, 1000);
      }, 250);
    } else {
      window.print();
    }
  }

  // SSE Unsubscribe handler
  let sseUnsub: (() => void) | null = null;

  onMount(() => {
    fetchData();
    sseUnsub = sse.subscribe((event) => {
      if (event?.code === 'UPDATE_TOKO_SETTING' || event?.code === 'UPDATE_STRUK_SETTING') {
        if (!isSavingStruk) {
          fetchData(true);
        }
      }
    });
  });

  onDestroy(() => {
    if (sseUnsub) sseUnsub();
  });
</script>

<svelte:window
  onkeydown={(e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      if (hasUnsavedChanges) {
        e.preventDefault();
        handleSaveAll();
      }
    }
  }}
/>

<div class="space-y-6 max-w-6xl mx-auto pb-24">
  <!-- Page Header -->
  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-4">
    <div class="flex items-center gap-2.5">
      <h1 class="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
        <Settings class="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
        <span>Pengaturan</span>
      </h1>
    </div>

    <div class="flex items-center gap-2 shrink-0">
      <Button variant="secondary" size="sm" onclick={fetchData} loading={loading} title="Segarkan Data">
        <RefreshCw class="w-3.5 h-3.5" />
        <span class="hidden sm:inline">Refresh</span>
      </Button>
    </div>
  </div>

  <!-- Navigation Tabs -->
  <div class="flex items-center gap-2 border-b border-neutral-200 dark:border-neutral-800 pb-px">
    <button
      type="button"
      onclick={() => (activeTab = 'toko')}
      class="flex items-center gap-2 px-4 py-2 text-xs font-semibold border-b-2 transition-colors {activeTab === 'toko' ? 'border-neutral-900 dark:border-neutral-100 text-neutral-900 dark:text-neutral-100' : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100'}"
    >
      <Store class="w-3.5 h-3.5" />
      <span>Identitas & Profil Toko</span>
      {#if isStoreChanged}
        <span class="w-1.5 h-1.5 rounded-full bg-amber-500" title="Ada perubahan belum disimpan"></span>
      {/if}
    </button>

    <button
      type="button"
      onclick={() => (activeTab = 'struk')}
      class="flex items-center gap-2 px-4 py-2 text-xs font-semibold border-b-2 transition-colors {activeTab === 'struk' ? 'border-neutral-900 dark:border-neutral-100 text-neutral-900 dark:text-neutral-100' : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100'}"
    >
      <Receipt class="w-3.5 h-3.5" />
      <span>Format Struk Belanja</span>
      {#if isStrukChanged}
        <span class="w-1.5 h-1.5 rounded-full bg-amber-500" title="Ada perubahan belum disimpan"></span>
      {/if}
    </button>
  </div>

  {#if loading}
    <div class="space-y-4">
      <Skeleton class="h-10 w-full" />
      <Skeleton class="h-64 w-full" />
    </div>
  {:else if activeTab === 'toko'}
    <!-- TAB 1: IDENTITAS TOKO -->
    <div class="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-[var(--bg-surface)] p-6 shadow-2xs">
      <form novalidate onsubmit={(e) => { e.preventDefault(); handleSaveAll(); }} class="space-y-5">
        <div>
          <h2 class="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            Identitas & Profil Toko
          </h2>
          <p class="text-xs text-neutral-500 mt-0.5">
            Informasi ini digunakan pada variabel struk belanja.
          </p>
        </div>

        {#if storeErrorMessage}
          <div class="p-3 rounded-md border border-red-500/30 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 text-xs flex items-start gap-2">
            <AlertCircle class="w-4 h-4 shrink-0 mt-0.5" />
            <span>{storeErrorMessage}</span>
          </div>
        {/if}

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Input
            id="toko-nama"
            label="Nama Toko / Usaha"
            bind:value={namaToko}
            placeholder="contoh: Toko Berkah Jaya, Minimarket KasirKu"
            required
            error={namaTokoError}
            oninput={() => {
              if (namaToko.trim()) namaTokoError = null;
            }}
            onblur={() => {
              if (!namaToko.trim()) namaTokoError = 'Nama toko wajib diisi.';
            }}
          >
            {#snippet prefix()}
              <Store class="w-4 h-4 text-neutral-400" />
            {/snippet}
          </Input>

          <Input
            id="toko-deskripsi"
            label="Deskripsi / Slogan Singkat"
            bind:value={deskripsiToko}
            placeholder="contoh: Sahabat Belanja Hemat & Terlengkap"
          >
            {#snippet prefix()}
              <FileText class="w-4 h-4 text-neutral-400" />
            {/snippet}
          </Input>
        </div>

        <div class="space-y-1.5">
          <label for="toko-alamat" class="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
            Alamat Toko
          </label>
          <div class="relative">
            <textarea
              id="toko-alamat"
              bind:value={alamatToko}
              rows="3"
              placeholder="Jalan, nomor ruko/gedung, kelurahan, kecamatan, kota/kabupaten..."
              class="w-full px-3 py-2 text-xs rounded-md border border-neutral-300 dark:border-neutral-700 bg-[var(--bg-surface)] text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/25 focus:border-[var(--brand)] dark:focus:ring-[var(--brand)]/25 dark:focus:border-[var(--brand)] placeholder:text-neutral-400"
            ></textarea>
          </div>
          <p class="text-[11px] text-neutral-500">Alamat lengkap fisik lokasi operasional toko.</p>
        </div>

        <div>
          <Input
            id="toko-telepon"
            label="Nomor Telepon / WhatsApp"
            bind:value={teleponToko}
            placeholder="contoh: 081234567890 / 021-1234567"
            hint="Format nomor telepon yang dapat dihubungi pelanggan."
            error={teleponTokoError}
            oninput={() => {
              if (teleponToko.trim()) teleponTokoError = null;
            }}
            onblur={() => {
              if (teleponToko.trim() && !/^[0-9+\-\s()]+$/.test(teleponToko.trim())) {
                teleponTokoError = 'Format nomor telepon tidak valid.';
              }
            }}
          >
            {#snippet prefix()}
              <Phone class="w-4 h-4 text-neutral-400" />
            {/snippet}
          </Input>
        </div>
      </form>
    </div>

  {:else if activeTab === 'struk'}
    <!-- TAB 2: FORMAT STRUK BELANJA -->
    <div class="space-y-6">
      <!-- Card Toggle: Gunakan Struk Kasir -->
      <div class="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-[var(--bg-surface)] p-5 shadow-2xs">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div class="flex items-start gap-3.5">
            <div class="w-9 h-9 rounded-md bg-[var(--bg-subtle)] border border-[var(--border-subtle)] flex items-center justify-center shrink-0 text-[var(--text-secondary)] mt-0.5">
              <Receipt class="w-5 h-5 text-[var(--brand)]" />
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h3 class="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Gunakan Struk Kasir</h3>
              </div>
              <p class="text-xs text-neutral-500 mt-0.5 leading-relaxed">
                Aktifkan fitur ini jika kasir Anda ingin mencetak struk belanja fisik kepada pelanggan setelah transaksi selesai.
              </p>
            </div>
          </div>

          <!-- Switch Toggle ON / OFF (local state only, saved with Discord floating bar) -->
          <div class="flex items-center gap-3 shrink-0 self-end sm:self-center">
            <span class="text-xs font-semibold tabular-nums {isStrukEnabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-neutral-400 dark:text-neutral-500'}">
              {isStrukEnabled ? 'ON' : 'OFF'}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={isStrukEnabled}
              aria-label="Gunakan Struk Kasir"
              disabled={isSavingStruk}
              onclick={() => (isStrukEnabled = !isStrukEnabled)}
              class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:ring-offset-2 disabled:opacity-50 {isStrukEnabled ? 'bg-[var(--brand)]' : 'bg-neutral-300 dark:bg-neutral-700'}"
            >
              <span
                class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out {isStrukEnabled ? 'translate-x-5' : 'translate-x-0'}"
              ></span>
            </button>
          </div>
        </div>
      </div>

      <!-- Design & Preview Section -->
      <div
        inert={!isStrukEnabled ? true : undefined}
        class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start transition-all duration-200 {!isStrukEnabled ? 'opacity-40 pointer-events-none select-none grayscale cursor-not-allowed' : ''}"
      >
        <!-- Left Column: CodeMirror Editor & Helpers (7 cols) -->
        <div class="lg:col-span-7 space-y-5">
          <div class="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-[var(--bg-surface)] p-5 shadow-2xs space-y-4">
            <!-- Editor Title Header with Variable Dialog Button -->
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-neutral-200 dark:border-neutral-800 pb-3">
              <div>
                <h2 class="text-sm font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                  <Code2 class="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
                  <span>Desain Template Struk HTML</span>
                </h2>
                <p class="text-xs text-neutral-500 mt-0.5">
                  Desain Struk dengan menggunakan HTML & CSS.
                </p>
              </div>

              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={!isStrukEnabled}
                onclick={() => (showVariableModal = true)}
                title="Lihat dan salin variabel template struk"
              >
                <FileCode class="w-3.5 h-3.5 text-neutral-500" />
                <span>Variabel Template</span>
              </Button>
            </div>

            {#if strukErrorMessage}
              <div class="p-3 rounded-md border border-red-500/30 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 text-xs flex items-start gap-2">
                <AlertCircle class="w-4 h-4 shrink-0 mt-0.5" />
                <span>{strukErrorMessage}</span>
              </div>
            {/if}

            <!-- CodeMirror HTML Editor Component -->
            <div class="space-y-1.5">
              <div class="flex items-center justify-between text-xs font-medium text-neutral-700 dark:text-neutral-300">
                <span>Editor Kode HTML</span>
              </div>
              
              <CodeEditor
                bind:value={strukContent}
                minHeight="360px"
                maxHeight="520px"
                readonly={!isStrukEnabled}
                placeholder="<!-- Masukkan kode HTML template struk di sini -->"
              />
            </div>

            <!-- Preset Templates (Dibawah Editor) -->
            <div class="space-y-2 pt-3 border-t border-neutral-200 dark:border-neutral-800">
              <div class="flex items-center justify-between">
                <span class="text-xs font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                  <span>Struk HTML Template</span>
                </span>
                <span class="text-[11px] text-neutral-400">Klik untuk menggunakan template</span>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {#each RECEIPT_PRESETS as preset}
                  <button
                    type="button"
                    disabled={!isStrukEnabled}
                    onclick={() => applyPreset(preset.template)}
                    class="p-2.5 text-left rounded-md border border-neutral-200 dark:border-neutral-700 bg-neutral-50/70 dark:bg-neutral-900/60 hover:bg-neutral-100 dark:hover:bg-neutral-800/80 hover:border-neutral-400 dark:hover:border-neutral-600 transition-all cursor-pointer group space-y-1 disabled:cursor-not-allowed"
                  >
                    <div class="text-xs font-semibold text-neutral-900 dark:text-neutral-100 group-hover:text-neutral-700 dark:group-hover:text-neutral-200 transition-colors">
                      {preset.name}
                    </div>
                    <p class="text-[11px] text-neutral-500 line-clamp-2 leading-relaxed">
                      {preset.description}
                    </p>
                  </button>
                {/each}
              </div>
            </div>
          </div>
        </div>

        <!-- Right Column: Real-time Live Preview (5 cols) -->
        <div class="lg:col-span-5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-950 p-5 space-y-4">
          <div class="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3">
            <div class="flex items-center gap-1.5">
              <Printer class="w-4 h-4 text-neutral-500" />
              <span class="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                Live Preview Struk
              </span>
            </div>

            <div class="flex items-center gap-2">
              <!-- Format selector -->
              <div class="inline-flex rounded-md border border-neutral-200 dark:border-neutral-800 p-0.5 bg-white dark:bg-neutral-900 shadow-2xs">
                <button
                  type="button"
                  disabled={!isStrukEnabled}
                  class="px-2 py-0.5 text-[11px] rounded transition-colors disabled:cursor-not-allowed {previewWidth === '58mm' ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 font-semibold' : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'}"
                  onclick={() => (previewWidth = '58mm')}
                >
                  58mm
                </button>
                <button
                  type="button"
                  disabled={!isStrukEnabled}
                  class="px-2 py-0.5 text-[11px] rounded transition-colors disabled:cursor-not-allowed {previewWidth === '80mm' ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 font-semibold' : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'}"
                  onclick={() => (previewWidth = '80mm')}
                >
                  80mm
                </button>
              </div>

              <Button
                variant="secondary"
                size="sm"
                disabled={!isStrukEnabled}
                onclick={handleTestPrint}
                title="Uji Cetak ke Printer"
              >
                <Printer class="w-3.5 h-3.5" />
                <span class="hidden sm:inline">Uji Print</span>
              </Button>
            </div>
          </div>

          <!-- Simulated Paper Receipt Container via Isolated Iframe -->
          <div class="p-2 sm:p-4 rounded border border-neutral-300 dark:border-neutral-800 bg-neutral-200 dark:bg-neutral-900/60 flex justify-center overflow-x-auto min-h-[460px]">
            <div
              class="bg-white rounded-md shadow-md border border-neutral-300 dark:border-neutral-700 overflow-hidden transition-all duration-150 {previewWidth === '58mm' ? 'w-[310px]' : 'w-[400px]'}"
            >
              <!-- Render Dynamic HTML Preview inside Isolated Sandbox Iframe -->
              <iframe
                title="Live Receipt Preview"
                srcdoc={renderedPreviewHtml}
                class="w-full h-[540px] border-0 bg-white block"
                sandbox="allow-same-origin"
              ></iframe>
            </div>
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>

<!-- Modal Dialog: Daftar Variabel Template Struk -->
<Modal
  bind:open={showVariableModal}
  title="Daftar Variabel Template Struk"
  description="Variabel placeholder di bawah ini akan otomatis digantikan dengan data riil toko & transaksi saat struk dicetak."
  size="lg"
>
  <div class="space-y-4">
    <!-- Search & Category Filters -->
    <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
      <div class="relative flex-1">
        <Search class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
        <input
          type="text"
          bind:value={variableSearchQuery}
          placeholder="Cari variabel (misal: nama toko, kasir, total)..."
          class="w-full pl-9 pr-3 py-1.5 text-xs rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--brand)]/50 focus:border-[var(--brand)] transition-colors"
        />
      </div>

      <div class="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
        {#each [
          { id: 'all', label: 'Semua' },
          { id: 'toko', label: 'Toko' },
          { id: 'transaksi', label: 'Transaksi' },
          { id: 'produk', label: 'Produk' },
          { id: 'pembayaran', label: 'Pembayaran' }
        ] as cat}
          <button
            type="button"
            onclick={() => (selectedCategory = cat.id as any)}
            class="px-2.5 py-1 text-xs rounded-md font-medium transition-colors whitespace-nowrap border {
              selectedCategory === cat.id
                ? 'border-[var(--brand)] bg-[var(--brand)] text-white shadow-2xs font-semibold'
                : 'border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
            }"
          >
            {cat.label}
          </button>
        {/each}
      </div>
    </div>

    <!-- Variables Table -->
    <div class="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden">
      <div class="max-h-[380px] overflow-y-auto">
        <table class="w-full text-left text-xs border-collapse">
          <thead class="sticky top-0 z-20 bg-[var(--bg-subtle)]">
            <tr class="text-[var(--text-muted)] font-medium text-[11px]">
              <th class="sticky top-0 z-20 bg-[var(--bg-subtle)] border-b border-[var(--border-subtle)] shadow-[inset_0_-1px_0_var(--border-subtle)] py-2.5 px-4 font-medium">Tag Variabel</th>
              <th class="sticky top-0 z-20 bg-[var(--bg-subtle)] border-b border-[var(--border-subtle)] shadow-[inset_0_-1px_0_var(--border-subtle)] py-2.5 px-4 font-medium">Keterangan</th>
              <th class="sticky top-0 z-20 bg-[var(--bg-subtle)] border-b border-[var(--border-subtle)] shadow-[inset_0_-1px_0_var(--border-subtle)] py-2.5 px-4 font-medium">Contoh Output</th>
              <th class="sticky top-0 z-20 bg-[var(--bg-subtle)] border-b border-[var(--border-subtle)] shadow-[inset_0_-1px_0_var(--border-subtle)] py-2.5 px-4 text-right font-medium w-28">Aksi</th>
            </tr>
          </thead>
        <tbody class="divide-y divide-[var(--border-subtle)]">
          {#if filteredVariables.length === 0}
            <tr>
              <td colspan="4" class="py-8 text-center text-[var(--text-muted)]">
                Tidak ada variabel yang sesuai dengan pencarian "{variableSearchQuery}".
              </td>
            </tr>
          {:else}
            {#each filteredVariables as variable}
              <tr class="hover:bg-[var(--bg-hover)] transition-colors">
                <td class="py-2.5 px-4">
                  <span class="inline-block text-[11px] font-semibold text-[var(--brand)] bg-[var(--bg-subtle)] px-2 py-0.5 rounded border border-[var(--border-subtle)] tabular-nums">
                    {variable.key}
                  </span>
                </td>
                <td class="py-2.5 px-4 text-[var(--text-primary)] font-medium">
                  {variable.label}
                </td>
                <td class="py-2.5 px-4 text-[var(--text-secondary)] tabular-nums text-[11px]">
                  {variable.example}
                </td>
                <td class="py-2.5 px-4 text-right">
                  <button
                    type="button"
                    onclick={() => copyVariable(variable.key)}
                    class="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md border transition-colors cursor-pointer {
                      copiedVariable === variable.key
                        ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium'
                        : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-contrast)] hover:bg-[var(--bg-hover)]'
                    }"
                  >
                    {#if copiedVariable === variable.key}
                      <CheckCircle2 class="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Tersalin!</span>
                    {:else}
                      <Copy class="w-3.5 h-3.5 opacity-60" />
                      <span>Salin</span>
                    {/if}
                  </button>
                </td>
              </tr>
            {/each}
          {/if}
        </tbody>
      </table>
      </div>
    </div>
  </div>

  {#snippet footer()}
    <Button variant="secondary" size="sm" onclick={() => (showVariableModal = false)}>
      <span>Tutup</span>
    </Button>
  {/snippet}
</Modal>

<!-- Discord-Style Floating Unsaved Changes Bar -->
{#if hasUnsavedChanges}
  <div
    transition:fly={{ y: 50, duration: 250 }}
    class="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-1.5rem)] max-w-2xl z-50 rounded-xl bg-neutral-900/95 dark:bg-neutral-950/95 text-white border border-neutral-700/70 dark:border-neutral-800 shadow-2xl p-2.5 sm:p-3.5 sm:px-5 flex items-center justify-between gap-2 sm:gap-4 backdrop-blur-md ring-1 ring-white/10"
  >
    <div class="flex items-center gap-2 min-w-0">
      <span class="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0 animate-pulse"></span>
      <span class="text-xs sm:text-sm font-medium text-neutral-100 truncate">
        <span class="hidden sm:inline">Klik 'Simpan Perubahan' untuk menerapkan</span>
        <span class="sm:hidden">Klik 'Simpan Perubahan' untuk menerapkan</span>
      </span>
    </div>

    <div class="flex items-center gap-1.5 sm:gap-2 shrink-0">
      <button
        type="button"
        disabled={isSavingStore || isSavingStruk}
        onclick={handleResetAll}
        class="px-2.5 sm:px-3 py-1.5 text-xs font-medium text-neutral-300 hover:text-white hover:underline transition-colors disabled:opacity-40 cursor-pointer"
      >
        Reset
      </button>

      <button
        type="button"
        disabled={isSavingStore || isSavingStruk}
        onclick={handleSaveAll}
        class="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white shadow-sm transition-all disabled:opacity-50 cursor-pointer"
      >
        {#if isSavingStore || isSavingStruk}
          <Loader2 class="w-3.5 h-3.5 animate-spin" />
          <span>Menyimpan…</span>
        {:else}
          <Save class="w-3.5 h-3.5" />
          <span class="hidden sm:inline">Simpan Perubahan</span>
          <span class="sm:hidden">Simpan</span>
        {/if}
      </button>
    </div>
  </div>
{/if}


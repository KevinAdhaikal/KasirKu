<svelte:head>
  <title>KasirKu | Settings</title>
</svelte:head>

<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
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
    Eye,
    Printer,
    Sparkles,
    Code2,
    Copy,
    RotateCcw,
    Search,
    FileCode
  } from 'lucide-svelte';

  export interface StoreSettings {
    id: number;
    name: string | null;
    desc: string | null;
    address: string | null;
    phone_num: string | null;
  }

  export interface StrukSettings {
    store_struk?: string | null;
    content?: string | null;
    value?: string | null;
  }

  let loading = $state(true);
  let activeTab = $state<'toko' | 'struk'>('toko');

  // Store form state
  let namaToko = $state('');
  let deskripsiToko = $state('');
  let alamatToko = $state('');
  let teleponToko = $state('');
  let isSavingStore = $state(false);
  let storeErrorMessage = $state<string | null>(null);
  let namaTokoError = $state<string | null>(null);
  let teleponTokoError = $state<string | null>(null);

  // Struk HTML form state
  let strukContent = $state('');
  let isSavingStruk = $state(false);
  let strukErrorMessage = $state<string | null>(null);
  let previewWidth = $state<'58mm' | '80mm'>('58mm');
  let copiedVariable = $state<string | null>(null);

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
    name: namaToko.trim() || 'SUMBERMART',
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

  async function fetchData() {
    loading = true;
    try {
      const [storeRes, strukRes] = await Promise.all([
        api.get<StoreSettings>('/api/settings/toko'),
        api.get<StrukSettings>('/api/settings/struk'),
      ]);

      if (storeRes) {
        namaToko = storeRes.name || '';
        deskripsiToko = storeRes.desc || '';
        alamatToko = storeRes.address || '';
        teleponToko = storeRes.phone_num || '';
      }

      if (strukRes) {
        const rawContent = strukRes.store_struk ?? strukRes.content ?? strukRes.value ?? '';
        // If content is empty, initialize with the standard preset
        strukContent = rawContent.trim() ? rawContent : RECEIPT_PRESETS[0].template;
      } else {
        strukContent = RECEIPT_PRESETS[0].template;
      }
    } catch (err: any) {
      toast.error('Gagal memuat pengaturan toko: ' + (err.message || ''));
    } finally {
      loading = false;
    }
  }

  async function handleSaveStore(e: Event) {
    e.preventDefault();
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

    if (hasError) return;

    isSavingStore = true;
    try {
      const params = new URLSearchParams({
        nama_toko: name,
        deskripsi_toko: deskripsiToko.trim(),
        alamat_toko: alamatToko.trim(),
        telepon_toko: phone,
      });

      await api.patch('/api/settings/toko', params);
      toast.success('Pengaturan identitas toko berhasil disimpan.');
    } catch (err: any) {
      storeErrorMessage = err.message || 'Gagal menyimpan pengaturan toko.';
    } finally {
      isSavingStore = false;
    }
  }

  async function handleSaveStruk(e: Event) {
    e.preventDefault();
    strukErrorMessage = null;

    isSavingStruk = true;
    try {
      await api.patch('/api/settings/struk', strukContent);
      toast.success('Format HTML struk belanja berhasil disimpan.');
    } catch (err: any) {
      strukErrorMessage = err.message || 'Gagal menyimpan format struk.';
    } finally {
      isSavingStruk = false;
    }
  }

  function applyPreset(template: string) {
    strukContent = template;
    toast.info('Template struk berhasil diterapkan ke editor.');
  }

  function copyVariable(key: string) {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(key);
      copiedVariable = key;
      setTimeout(() => {
        if (copiedVariable === key) copiedVariable = null;
      }, 2000);
      toast.success(`Variabel ${key} disalin ke clipboard!`);
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
        fetchData();
      }
    });
  });

  onDestroy(() => {
    if (sseUnsub) sseUnsub();
  });
</script>

<div class="space-y-6 max-w-6xl mx-auto">
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
    </button>

    <button
      type="button"
      onclick={() => (activeTab = 'struk')}
      class="flex items-center gap-2 px-4 py-2 text-xs font-semibold border-b-2 transition-colors {activeTab === 'struk' ? 'border-neutral-900 dark:border-neutral-100 text-neutral-900 dark:text-neutral-100' : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100'}"
    >
      <Receipt class="w-3.5 h-3.5" />
      <span>Format Struk Belanja</span>
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
      <form novalidate onsubmit={handleSaveStore} class="space-y-5">
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

        <div class="flex items-center justify-end gap-2 pt-4 border-t border-neutral-200 dark:border-neutral-800">
          <Button type="submit" variant="primary" size="sm" loading={isSavingStore}>
            <Save class="w-3.5 h-3.5" />
            <span>Simpan Identitas Toko</span>
          </Button>
        </div>
      </form>
    </div>

  {:else if activeTab === 'struk'}
    <!-- TAB 2: FORMAT STRUK (HTML + CODEMIRROR) -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
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
                Tulis struktur HTML & inline CSS sesuai selera printer kasir Anda.
              </p>
            </div>

            <Button
              type="button"
              variant="secondary"
              size="sm"
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
                  onclick={() => applyPreset(preset.template)}
                  class="p-2.5 text-left rounded-md border border-neutral-200 dark:border-neutral-700 bg-neutral-50/70 dark:bg-neutral-900/60 hover:bg-neutral-100 dark:hover:bg-neutral-800/80 hover:border-neutral-400 dark:hover:border-neutral-600 transition-all cursor-pointer group space-y-1"
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

          <!-- Actions -->
          <div class="flex items-center justify-between pt-4 border-t border-neutral-200 dark:border-neutral-800">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onclick={() => applyPreset(RECEIPT_PRESETS[0].template)}
            >
              <RotateCcw class="w-3.5 h-3.5" />
              <span>Reset Default</span>
            </Button>

            <Button
              type="button"
              variant="primary"
              size="sm"
              loading={isSavingStruk}
              onclick={handleSaveStruk}
            >
              <Save class="w-3.5 h-3.5" />
              <span>Simpan Format HTML</span>
            </Button>
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
                class="px-2 py-0.5 text-[11px] rounded font-mono transition-colors {previewWidth === '58mm' ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 font-semibold' : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'}"
                onclick={() => (previewWidth = '58mm')}
              >
                58mm
              </button>
              <button
                type="button"
                class="px-2 py-0.5 text-[11px] rounded font-mono transition-colors {previewWidth === '80mm' ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 font-semibold' : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'}"
                onclick={() => (previewWidth = '80mm')}
              >
                80mm
              </button>
            </div>

            <Button variant="secondary" size="sm" onclick={handleTestPrint} title="Uji Cetak ke Printer">
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
        <Search class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
        <input
          type="text"
          bind:value={variableSearchQuery}
          placeholder="Cari variabel (misal: nama toko, kasir, total)..."
          class="w-full pl-9 pr-3 py-1.5 text-xs rounded-md border border-neutral-300 dark:border-neutral-700 bg-[var(--bg-surface)] text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/25 focus:border-[var(--brand)]"
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
            class="px-2.5 py-1 text-xs rounded font-medium transition-colors whitespace-nowrap {
              selectedCategory === cat.id
                ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 font-semibold'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
            }"
          >
            {cat.label}
          </button>
        {/each}
      </div>
    </div>

    <!-- Variables Table -->
    <div class="border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden max-h-[380px] overflow-y-auto">
      <table class="w-full text-left text-xs border-collapse">
        <thead class="bg-neutral-100 dark:bg-neutral-900/80 text-neutral-600 dark:text-neutral-400 sticky top-0 border-b border-neutral-200 dark:border-neutral-800">
          <tr>
            <th class="py-2.5 px-3 font-semibold">Variabel Tag</th>
            <th class="py-2.5 px-3 font-semibold">Keterangan</th>
            <th class="py-2.5 px-3 font-semibold">Contoh Output</th>
            <th class="py-2.5 px-3 text-right font-semibold">Aksi</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-neutral-200 dark:divide-neutral-800">
          {#if filteredVariables.length === 0}
            <tr>
              <td colspan="4" class="py-6 text-center text-neutral-400">
                Tidak ada variabel yang sesuai dengan pencarian "{variableSearchQuery}".
              </td>
            </tr>
          {:else}
            {#each filteredVariables as variable}
              <tr class="hover:bg-neutral-50 dark:hover:bg-neutral-900/40 transition-colors">
                <td class="py-2.5 px-3">
                  <span class="inline-block font-mono text-[11px] font-semibold text-[var(--brand-ink)] dark:text-[var(--brand)] bg-[var(--brand-soft)] dark:bg-[var(--brand-soft)]/20 px-2 py-0.5 rounded border border-[var(--border-subtle)]">
                    {variable.key}
                  </span>
                </td>
                <td class="py-2.5 px-3 text-neutral-800 dark:text-neutral-200">
                  {variable.label}
                </td>
                <td class="py-2.5 px-3 text-neutral-500 dark:text-neutral-400 font-mono text-[11px]">
                  {variable.example}
                </td>
                <td class="py-2.5 px-3 text-right">
                  <button
                    type="button"
                    onclick={() => copyVariable(variable.key)}
                    class="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded border transition-all cursor-pointer {
                      copiedVariable === variable.key
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-medium'
                        : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                    }"
                  >
                    {#if copiedVariable === variable.key}
                      <CheckCircle2 class="w-3.5 h-3.5 text-emerald-600" />
                      <span>Tersalin!</span>
                    {:else}
                      <Copy class="w-3.5 h-3.5 text-neutral-400" />
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

  {#snippet footer()}
    <Button variant="secondary" size="sm" onclick={() => (showVariableModal = false)}>
      <span>Tutup</span>
    </Button>
  {/snippet}
</Modal>


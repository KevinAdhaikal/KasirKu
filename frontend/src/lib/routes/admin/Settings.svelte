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
  import { formatRupiah, formatDateTime } from '../../utils/format';
  import {
    Store,
    Receipt,
    Phone,
    Mail,
    MapPin,
    FileText,
    Save,
    RefreshCw,
    CheckCircle2,
    AlertCircle,
    Eye,
    Printer,
    Sparkles
  } from 'lucide-svelte';

  export interface StoreSettings {
    id: number;
    name: string | null;
    description: string | null;
    address: string | null;
    no_phone: string | null;
    email: string | null;
    created_ms?: number;
    modified_ms?: number;
  }

  export interface StrukSettings {
    id: number;
    content: string | null;
    modified_ms?: number;
  }

  let loading = $state(true);
  let activeTab = $state<'toko' | 'struk'>('toko');

  // Store form state
  let namaToko = $state('');
  let deskripsiToko = $state('');
  let alamatToko = $state('');
  let teleponToko = $state('');
  let emailToko = $state('');
  let isSavingStore = $state(false);
  let storeErrorMessage = $state<string | null>(null);
  let namaTokoError = $state<string | null>(null);
  let teleponTokoError = $state<string | null>(null);
  let emailTokoError = $state<string | null>(null);

  // Struk form state
  let strukContent = $state('');
  let isSavingStruk = $state(false);
  let strukErrorMessage = $state<string | null>(null);

  async function fetchData() {
    loading = true;
    try {
      const [storeRes, strukRes] = await Promise.all([
        api.get<StoreSettings>('/api/settings/toko'),
        api.get<StrukSettings>('/api/settings/struk'),
      ]);

      if (storeRes) {
        namaToko = storeRes.name || '';
        deskripsiToko = storeRes.description || '';
        alamatToko = storeRes.address || '';
        teleponToko = storeRes.no_phone || '';
        emailToko = storeRes.email || '';
      }

      if (strukRes) {
        strukContent = strukRes.content || '';
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
    emailTokoError = null;

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

    const email = emailToko.trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      emailTokoError = 'Format email toko tidak valid.';
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
        email_toko: email,
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
      toast.success('Format teks struk kasir berhasil disimpan.');
    } catch (err: any) {
      strukErrorMessage = err.message || 'Gagal menyimpan format struk.';
    } finally {
      isSavingStruk = false;
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

<div class="space-y-6 max-w-5xl mx-auto">
  <!-- Page Header -->
  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-4">
    <div class="flex items-center gap-2.5">
      <h1 class="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
        Pengaturan
      </h1>
      <span class="text-xs font-mono px-2 py-0.5 rounded border border-neutral-200 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400">
        Toko & Struk
      </span>
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
      <Skeleton class="h-48 w-full" />
    </div>
  {:else if activeTab === 'toko'}
    <!-- TAB 1: IDENTITAS TOKO -->
    <div class="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-[var(--bg-surface)] p-6 shadow-2xs">
      <form novalidate onsubmit={handleSaveStore} class="space-y-5">
        <div>
          <h2 class="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            Informasi Usaha
          </h2>
          <p class="text-xs text-neutral-500 mt-0.5">
            Informasi ini dicetak pada bagian atas setiap struk kasir dan dokumen resmi toko.
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

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
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

          <Input
            id="toko-email"
            label="Alamat Email Usaha"
            type="email"
            bind:value={emailToko}
            placeholder="contoh: toko@domain.com"
            hint="Email resmi untuk korespondensi usaha."
            error={emailTokoError}
            oninput={() => {
              if (emailToko.trim()) emailTokoError = null;
            }}
            onblur={() => {
              if (emailToko.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailToko.trim())) {
                emailTokoError = 'Format email toko tidak valid.';
              }
            }}
          >
            {#snippet prefix()}
              <Mail class="w-4 h-4 text-neutral-400" />
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
    <!-- TAB 2: FORMAT STRUK -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <!-- Editor Column (7 cols) -->
      <div class="lg:col-span-7 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-[var(--bg-surface)] p-6 shadow-2xs space-y-5">
        <div>
          <h2 class="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            Teks Catatan Kaki (Footer Struk)
          </h2>
          <p class="text-xs text-neutral-500 mt-0.5">
            Teks ini dicetak di bagian paling bawah nota belanja pelanggan setelah rincian total pembayaran.
          </p>
        </div>

        {#if strukErrorMessage}
          <div class="p-3 rounded-md border border-red-500/30 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 text-xs flex items-start gap-2">
            <AlertCircle class="w-4 h-4 shrink-0 mt-0.5" />
            <span>{strukErrorMessage}</span>
          </div>
        {/if}

        <form novalidate onsubmit={handleSaveStruk} class="space-y-4">
          <div class="space-y-1.5">
            <label for="struk-content" class="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
              Isi Teks Footer Struk
            </label>
            <textarea
              id="struk-content"
              bind:value={strukContent}
              rows="6"
              placeholder="contoh: Terima kasih telah berbelanja di toko kami!&#10;Barang yang sudah dibeli tidak dapat ditukar kembali kecuali ada perjanjian."
              class="w-full px-3 py-2 font-mono text-xs rounded-md border border-neutral-300 dark:border-neutral-700 bg-[var(--bg-surface)] text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/25 focus:border-[var(--brand)] dark:focus:ring-[var(--brand)]/25 dark:focus:border-[var(--brand)] placeholder:text-neutral-400 leading-relaxed"
            ></textarea>
            <p class="text-[11px] text-neutral-500">
              Gunakan baris baru (Enter) untuk memisahkan baris pesan.
            </p>
          </div>

          <!-- Preset snippets -->
          <div class="space-y-1.5 pt-1">
            <span class="text-[11px] text-neutral-500 font-medium">Contoh Teks Cepat:</span>
            <div class="flex flex-wrap gap-1.5">
              <button
                type="button"
                onclick={() => (strukContent = 'Terima kasih atas kunjungan Anda!\nBarang yang sudah dibeli tidak dapat dikembalikan.')}
                class="px-2 py-1 text-[11px] rounded border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 hover:bg-[var(--bg-hover)] transition-colors"
              >
                Standar Kasir
              </button>
              <button
                type="button"
                onclick={() => (strukContent = 'Terima Kasih Telah Berbelanja!\nKritik & Saran: WA ' + (teleponToko || '08123456789') + '\nSimpan struk ini sebagai bukti pembayaran sah.')}
                class="px-2 py-1 text-[11px] rounded border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 hover:bg-[var(--bg-hover)] transition-colors"
              >
                Dengan Kontak WA
              </button>
              <button
                type="button"
                onclick={() => (strukContent = '=== TERIMA KASIH ===\nSemoga harimu menyenangkan!\nFollow IG kami: @kasirku')}
                class="px-2 py-1 text-[11px] rounded border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 hover:bg-[var(--bg-hover)] transition-colors"
              >
                Ramah & Media Sosial
              </button>
            </div>
          </div>

          <div class="flex items-center justify-end gap-2 pt-4 border-t border-neutral-200 dark:border-neutral-800">
            <Button type="submit" variant="primary" size="sm" loading={isSavingStruk}>
              <Save class="w-3.5 h-3.5" />
              <span>Simpan Format Struk</span>
            </Button>
          </div>
        </form>
      </div>

      <!-- Live Preview Column (5 cols) -->
      <div class="lg:col-span-5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-950 p-5 space-y-3">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-1.5">
            <Printer class="w-3.5 h-3.5 text-neutral-500" />
            <span class="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              Live Struk Preview (58mm Thermal)
            </span>
          </div>
        </div>

        <!-- Simulated Paper Receipt -->
        <div id="simulated-receipt-paper" class="bg-white text-neutral-900 p-5 rounded border border-neutral-300 font-mono text-[11px] shadow-sm max-w-xs mx-auto space-y-3 select-none">
          <!-- Header -->
          <div class="text-center space-y-0.5 border-b border-dashed border-neutral-400 pb-3">
            <p class="font-bold text-sm tracking-tight uppercase">
              {namaToko || 'NAMA TOKO ANDA'}
            </p>
            {#if deskripsiToko}
              <p class="text-[10px] text-neutral-600">{deskripsiToko}</p>
            {/if}
            {#if alamatToko}
              <p class="text-[10px] text-neutral-600 leading-tight">{alamatToko}</p>
            {/if}
            {#if teleponToko}
              <p class="text-[10px] text-neutral-600">Telp: {teleponToko}</p>
            {/if}
          </div>

          <!-- Meta Info -->
          <div class="space-y-0.5 text-[10px] text-neutral-600 border-b border-dashed border-neutral-400 pb-2">
            <div class="flex justify-between">
              <span>No. Struk</span>
              <span class="font-bold text-neutral-900">TRX-SAMPLE</span>
            </div>
            <div class="flex justify-between">
              <span>Kasir</span>
              <span>Kasir Utama</span>
            </div>
            <div class="flex justify-between">
              <span>Waktu</span>
              <span>{formatDateTime(Date.now())}</span>
            </div>
          </div>

          <!-- Dummy Items -->
          <div class="space-y-1.5 border-b border-dashed border-neutral-400 pb-2">
            <div>
              <p class="font-bold">Teh Botol Sosro 350ml</p>
              <div class="flex justify-between text-neutral-600">
                <span>2 x Rp4.500,00</span>
                <span class="font-bold text-neutral-900">Rp9.000,00</span>
              </div>
            </div>
            <div>
              <p class="font-bold">Kopi Kapal Api Special</p>
              <div class="flex justify-between text-neutral-600">
                <span>1 x Rp3.000,00</span>
                <span class="font-bold text-neutral-900">Rp3.000,00</span>
              </div>
            </div>
          </div>

          <!-- Totals -->
          <div class="space-y-0.5 text-[10px] border-b border-dashed border-neutral-400 pb-2">
            <div class="flex justify-between font-bold text-xs pt-0.5">
              <span>TOTAL</span>
              <span>Rp12.000,00</span>
            </div>
            <div class="flex justify-between text-neutral-600">
              <span>TUNAI</span>
              <span>Rp20.000,00</span>
            </div>
            <div class="flex justify-between text-neutral-600">
              <span>KEMBALI</span>
              <span>Rp8.000,00</span>
            </div>
          </div>

          <!-- Live Footer Notes -->
          <div class="text-center pt-2 whitespace-pre-line text-[10px] leading-relaxed text-neutral-700">
            {strukContent || 'Terima kasih telah berbelanja!\nBarang yang dibeli tidak dapat ditukar kembali.'}
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>

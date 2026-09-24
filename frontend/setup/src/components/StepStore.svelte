<script lang="ts">
  import type { StoreConfig } from '../types';

  interface Props {
    config: StoreConfig;
    onNext?: () => void;
    onBack?: () => void;
  }

  let { config = $bindable(), onNext, onBack }: Props = $props();

  export function proceed(): boolean {
    onNext?.();
    return true;
  }
</script>

<div class="space-y-6 text-ink">
  <!-- Title Header -->
  <div class="space-y-1.5 border-b border-line pb-4">
    <h2 class="text-xl font-bold text-ink tracking-tight">Profil & Identitas Toko</h2>
    <p class="text-sm text-ink-muted leading-relaxed">
      Informasi toko yang akan dicetak pada kepala struk belanja kasir (dapat diubah kapan saja).
    </p>
  </div>

  <!-- Form Fields Panel -->
  <div class="p-6 rounded-2xl border border-line bg-surface space-y-4">
    <!-- Store Name -->
    <div>
      <label for="store-name" class="block text-sm font-semibold text-ink mb-2">
        Nama Toko / Usaha <span class="text-ink-faint font-normal">(opsional)</span>
      </label>
      <input
        id="store-name"
        type="text"
        bind:value={config.store_name}
        placeholder="Contoh: Toko Berkah Jaya"
        class="w-full px-4 py-2.5 rounded-xl border border-line bg-surface text-sm text-ink transition-colors focus:outline-hidden focus:border-brand focus:ring-1 focus:ring-brand/30"
      />
    </div>

    <!-- Store Slogan -->
    <div>
      <label for="store-desc" class="block text-sm font-semibold text-ink mb-2">
        Slogan / Deskripsi Singkat <span class="text-ink-faint font-normal">(opsional)</span>
      </label>
      <input
        id="store-desc"
        type="text"
        bind:value={config.store_desc}
        placeholder="Contoh: Belanja Hemat & Lengkap"
        class="w-full px-4 py-2.5 rounded-xl border border-line bg-surface text-sm text-ink transition-colors focus:outline-hidden focus:border-brand focus:ring-1 focus:ring-brand/30"
      />
    </div>

    <!-- Phone Number -->
    <div>
      <label for="store-phone" class="block text-sm font-semibold text-ink mb-2">
        Nomor Telepon / WhatsApp <span class="text-ink-faint font-normal">(opsional)</span>
      </label>
      <input
        id="store-phone"
        type="text"
        bind:value={config.store_phone_num}
        placeholder="Contoh: 0812-3456-7890"
        class="w-full px-4 py-2.5 rounded-xl border border-line bg-surface text-sm text-ink transition-colors focus:outline-hidden focus:border-brand focus:ring-1 focus:ring-brand/30"
      />
    </div>


    <!-- Store Address -->
    <div>
      <label for="store-address" class="block text-sm font-semibold text-ink mb-2">
        Alamat Toko <span class="text-ink-faint font-normal">(opsional)</span>
      </label>
      <textarea
        id="store-address"
        rows="3"
        bind:value={config.store_address}
        placeholder="Contoh: Jl. Merdeka No. 12, Bandung"
        class="w-full px-4 py-2.5 rounded-xl border border-line bg-surface text-sm text-ink transition-colors focus:outline-hidden focus:border-brand focus:ring-1 focus:ring-brand/30 resize-none leading-relaxed"
      ></textarea>
    </div>
  </div>
</div>

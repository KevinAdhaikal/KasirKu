<script lang="ts">
  import type { StoreConfig } from '../types';

  interface Props {
    config: StoreConfig;
  }

  let { config = $bindable() }: Props = $props();
</script>

<div class="space-y-6">
  <!-- Title -->
  <div>
    <h2 class="text-lg font-medium text-text-primary">Profil & Identitas Toko</h2>
    <p class="text-sm text-text-secondary mt-0.5">
      Informasi toko yang dicetak pada struk belanja (opsional, dapat diisi atau diedit sewaktu-waktu).
    </p>
  </div>

  <!-- Form Fields -->
  <div class="p-4 rounded-lg bg-surface border border-border space-y-4">
    <!-- Store Name -->
    <div>
      <label for="store-name" class="block text-xs font-medium text-text-muted mb-1">
        Nama Toko / Usaha <span class="text-text-muted font-normal">(opsional)</span>
      </label>
      <input
        id="store-name"
        type="text"
        bind:value={config.store_name}
        placeholder="Contoh: Toko Berkah"
        class="w-full px-3 py-2 rounded-lg bg-surface border border-border text-sm text-text-primary focus:outline-hidden focus:border-brand focus:ring-1 focus:ring-brand/20 transition-colors"
      />
    </div>

    <!-- Store Description / Slogan -->
    <div>
      <label for="store-desc" class="block text-xs font-medium text-text-muted mb-1">
        Deskripsi / Slogan <span class="text-text-muted font-normal">(opsional)</span>
      </label>
      <input
        id="store-desc"
        type="text"
        bind:value={config.store_desc}
        placeholder="Contoh: Menyediakan aneka kebutuhan pokok"
        class="w-full px-3 py-2 rounded-lg bg-surface border border-border text-sm text-text-primary focus:outline-hidden focus:border-brand focus:ring-1 focus:ring-brand/20 transition-colors"
      />
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <!-- Phone Number -->
      <div>
        <label for="store-phone" class="block text-xs font-medium text-text-muted mb-1">
          Nomor Telepon / WhatsApp <span class="text-text-muted font-normal">(opsional)</span>
        </label>
        <input
          id="store-phone"
          type="text"
          bind:value={config.store_phone_num}
          placeholder="081234567890"
          class="w-full px-3 py-2 rounded-lg bg-surface border border-border text-sm font-mono text-text-primary focus:outline-hidden focus:border-brand focus:ring-1 focus:ring-brand/20 transition-colors"
        />
      </div>

      <!-- Address -->
      <div>
        <label for="store-address" class="block text-xs font-medium text-text-muted mb-1">
          Alamat Toko <span class="text-text-muted font-normal">(opsional)</span>
        </label>
        <textarea
          id="store-address"
          rows="2"
          bind:value={config.store_address}
          placeholder="Jl. Merdeka No. 12"
          class="w-full px-3 py-2 rounded-lg bg-surface border border-border text-sm text-text-primary focus:outline-hidden focus:border-brand focus:ring-1 focus:ring-brand/20 transition-colors resize-none"
        ></textarea>
      </div>
    </div>
  </div>

</div>

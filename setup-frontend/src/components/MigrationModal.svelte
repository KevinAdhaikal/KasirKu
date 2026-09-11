<script lang="ts">
  import { AlertTriangle, RefreshCw, Trash2, X } from 'lucide-svelte';

  interface Props {
    open: boolean;
    version?: string;
    onSelect: (resetDatabase: boolean) => void;
    onClose: () => void;
  }

  let { open, version = '', onSelect, onClose }: Props = $props();
  let showConfirmWipe = $state(false);
</script>

{#if open}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
    <div 
      class="bg-surface border border-border rounded-lg max-w-md w-full shadow-lg overflow-hidden"
      role="dialog"
      aria-modal="true"
    >
      <!-- Header -->
      <div class="p-4 border-b border-border flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <AlertTriangle class="w-4 h-4 text-amber-500" />
          <h3 class="font-medium text-sm text-text-primary">Basis Data Lama Ditemukan</h3>
        </div>
        <button 
          onclick={onClose}
          class="text-text-muted hover:text-text-primary p-1 rounded hover:bg-subtle transition-colors cursor-pointer"
          title="Tutup"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Body -->
      <div class="p-4 space-y-4 text-xs">
        {#if !showConfirmWipe}
          <div class="p-3 rounded bg-subtle/50 border border-border space-y-1.5">
            <div class="flex justify-between">
              <span class="text-text-muted">Status:</span>
              <span class="text-emerald-600 dark:text-emerald-400 font-medium">Tabel KasirKu Terdeteksi</span>
            </div>
            {#if version}
              <div class="flex justify-between">
                <span class="text-text-muted">Versi Terakhir:</span>
                <span class="font-mono text-text-primary">{version}</span>
              </div>
            {/if}
          </div>

          <p class="text-text-secondary leading-relaxed">
            Database ini sudah memiliki data dari instalasi sebelumnya. Pilih bagaimana sistem mengelola database ini:
          </p>

          <div class="space-y-2 pt-1">
            <!-- Option 1: Keep & Migrate -->
            <button
              type="button"
              onclick={() => onSelect(false)}
              class="w-full text-left p-3 rounded-lg border border-border hover:border-brand hover:bg-subtle/40 transition-colors flex items-start gap-3 cursor-pointer"
            >
              <div class="p-1.5 rounded bg-brand/10 text-brand shrink-0 mt-0.5">
                <RefreshCw class="w-3.5 h-3.5" />
              </div>
              <div class="space-y-0.5">
                <div class="font-medium text-text-primary text-xs">Gunakan & Migrasi Data Lama</div>
                <p class="text-xs text-text-secondary">
                  Pertahankan semua produk, transaksi, dan riwayat. Skema akan disesuaikan otomatis jika ada pembaruan.
                </p>
              </div>
            </button>

            <!-- Option 2: Wipe & Fresh -->
            <button
              type="button"
              onclick={() => showConfirmWipe = true}
              class="w-full text-left p-3 rounded-lg border border-border hover:border-red-500/50 hover:bg-red-500/5 transition-colors flex items-start gap-3 cursor-pointer"
            >
              <div class="p-1.5 rounded bg-red-500/10 text-red-500 shrink-0 mt-0.5">
                <Trash2 class="w-3.5 h-3.5" />
              </div>
              <div class="space-y-0.5">
                <div class="font-medium text-red-500 text-xs">Kosongkan & Buat Database Baru</div>
                <p class="text-xs text-text-secondary">
                  Hapus seluruh tabel dan data lama, lalu mulai dari awal (fresh install).
                </p>
              </div>
            </button>
          </div>
        {:else}
          <!-- Confirmation Screen for Wipe -->
          <div class="p-3.5 rounded bg-red-500/10 border border-red-500/30 text-red-500 space-y-1.5">
            <div class="font-medium">Konfirmasi Penghapusan Data</div>
            <p class="text-xs text-red-400 leading-relaxed">
              Tindakan ini akan menghapus permanen seluruh tabel dan riwayat toko pada database ini.
            </p>
          </div>

          <div class="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onclick={() => showConfirmWipe = false}
              class="px-3 py-1.5 text-xs rounded border border-border hover:bg-subtle text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onclick={() => onSelect(true)}
              class="px-3 py-1.5 text-xs rounded bg-red-600 hover:bg-red-500 text-white transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Trash2 class="w-3.5 h-3.5" />
              Ya, Hapus Data
            </button>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}

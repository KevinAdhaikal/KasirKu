<script lang="ts">
  import { 
    AlertTriangle, 
    RefreshCw, 
    Trash2, 
    X, 
    ShieldAlert,
    CornerDownLeft
  } from 'lucide-svelte';

  interface Props {
    open: boolean;
    version?: string;
    onSelect: (resetDatabase: boolean) => void;
    onClose: () => void;
  }

  let { open, version = '', onSelect, onClose }: Props = $props();
  let showConfirmWipe = $state(false);

  function handleKeyDown(e: KeyboardEvent) {
    if (!open) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      if (showConfirmWipe) {
        showConfirmWipe = false;
      } else {
        onClose();
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (showConfirmWipe) {
        onSelect(true);
      } else {
        onSelect(false);
      }
    }
  }
</script>

<svelte:window onkeydown={handleKeyDown} />

{#if open}
  <div 
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none"
    role="dialog"
    aria-modal="true"
    aria-labelledby="modal-headline"
  >
    <!-- Modal Dialog Window -->
    <div class="bg-surface border border-line rounded-xl max-w-md w-full shadow-xl overflow-hidden text-ink flex flex-col font-sans">
      <!-- Header -->
      <div class="px-5 py-4 border-b border-line flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-lg bg-warning/15 text-warning flex items-center justify-center shrink-0">
            <AlertTriangle class="w-4 h-4" />
          </div>
          <div>
            <h3 id="modal-headline" class="font-semibold text-sm text-ink leading-tight">
              Basis Data Lama Ditemukan
            </h3>
            <p class="text-xs text-ink-faint mt-0.5">
              {version ? `Versi: ${version}` : 'Tabel database sebelumnya terdeteksi'}
            </p>
          </div>
        </div>

        <button 
          type="button"
          onclick={onClose}
          class="text-ink-muted hover:text-ink p-1 rounded-lg hover:bg-subtle transition-colors cursor-pointer"
          title="Tutup (Esc)"
          aria-label="Tutup Dialog"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Modal Body -->
      <div class="p-5 space-y-4 text-xs">
        {#if !showConfirmWipe}
          <p class="text-ink-muted leading-relaxed">
            Database yang Anda pilih sudah memiliki data dari instalasi KasirKu sebelumnya. Tentukan bagaimana data tersebut akan diproses:
          </p>

          <!-- Options -->
          <div class="space-y-3 pt-1">
            <!-- Option 1: Keep & Migrate -->
            <button
              type="button"
              onclick={() => onSelect(false)}
              class="w-full text-left p-4 rounded-xl border border-brand/30 bg-brand-soft/30 hover:bg-brand-soft/50 transition-all flex items-start gap-3 cursor-pointer group focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand/40"
            >
              <div class="w-7 h-7 rounded-lg bg-brand text-white shrink-0 mt-0.5 flex items-center justify-center shadow-xs">
                <RefreshCw class="w-3.5 h-3.5" />
              </div>
              <div class="space-y-1 flex-1">
                <div class="flex items-center justify-between">
                  <span class="font-semibold text-ink text-xs">
                    Gunakan & Perbarui Data Lama
                  </span>
                  <kbd class="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-line bg-surface text-[10px] text-ink-faint">
                    Enter <CornerDownLeft class="w-2.5 h-2.5" />
                  </kbd>
                </div>
                <p class="text-xs text-ink-muted leading-relaxed">
                  Mempertahankan semua data produk dan transaksi sebelumnya, serta memperbarui struktur tabel jika diperlukan.
                </p>
              </div>
            </button>

            <!-- Option 2: Wipe & Fresh -->
            <button
              type="button"
              onclick={() => showConfirmWipe = true}
              class="w-full text-left p-4 rounded-xl border border-danger/20 hover:border-danger/40 bg-danger/5 hover:bg-danger/10 transition-all flex items-start gap-3 cursor-pointer group focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-danger/30"
            >
              <div class="w-7 h-7 rounded-lg bg-danger/15 text-danger shrink-0 mt-0.5 flex items-center justify-center">
                <Trash2 class="w-3.5 h-3.5" />
              </div>
              <div class="space-y-1 flex-1">
                <span class="font-semibold text-danger text-xs block">
                  Hapus & Buat Database Baru
                </span>
                <p class="text-xs text-ink-muted leading-relaxed">
                  Menghapus semua data lama dan memulai instalasi bersih dari awal.
                </p>
              </div>
            </button>
          </div>
        {:else}
          <!-- Confirmation Screen -->
          <div class="p-4 rounded-xl border border-danger/30 bg-danger/10 space-y-2">
            <div class="flex items-center gap-2 text-danger font-semibold text-xs">
              <ShieldAlert class="w-4 h-4 shrink-0" />
              <span>Konfirmasi Penghapusan Data</span>
            </div>
            <p class="text-xs text-danger/90 leading-relaxed">
              Tindakan ini akan <strong>menghapus seluruh data toko dan transaksi secara permanen</strong>. Apakah Anda yakin ingin mengosongkan database ini?
            </p>
          </div>

          <!-- Action Buttons -->
          <div class="flex items-center justify-end gap-2.5 pt-2 border-t border-line">
            <button
              type="button"
              onclick={() => showConfirmWipe = false}
              class="px-3.5 py-2 text-xs font-medium rounded-lg border border-line hover:bg-subtle text-ink transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onclick={() => onSelect(true)}
              class="px-4 py-2 text-xs font-medium rounded-lg bg-danger hover:bg-danger/90 text-white transition-colors cursor-pointer flex items-center gap-2 shadow-xs"
            >
              <Trash2 class="w-3.5 h-3.5" />
              <span>Ya, Hapus & Mulai Baru</span>
            </button>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}

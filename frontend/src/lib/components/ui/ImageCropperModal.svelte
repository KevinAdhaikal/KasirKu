<script lang="ts">
  import { ZoomIn, ZoomOut, RotateCcw, Check, X, Move } from 'lucide-svelte';
  import Button from './Button.svelte';

  interface Props {
    open?: boolean;
    imageSrc: string;
    oncrop: (result: { dataUrl: string; base64: string }) => void;
    onclose: () => void;
  }

  let {
    open = $bindable(false),
    imageSrc,
    oncrop,
    onclose,
  }: Props = $props();

  // Cropper geometry
  const CROP_SIZE = 240; // Diameter of the circle crop area in px
  const OUTPUT_SIZE = 400; // Output resolution in px

  let imageElement: HTMLImageElement | null = $state(null);
  let naturalWidth = $state(1);
  let naturalHeight = $state(1);

  let zoom = $state(1);
  let panX = $state(0);
  let panY = $state(0);

  let isDragging = $state(false);
  let startX = 0;
  let startY = 0;
  let startPanX = 0;
  let startPanY = 0;

  // Base scale so image fills the circular aperture at zoom = 1
  let baseScale = $derived.by(() => {
    if (!naturalWidth || !naturalHeight) return 1;
    return Math.max(CROP_SIZE / naturalWidth, CROP_SIZE / naturalHeight);
  });

  // Effective scale
  let effectiveScale = $derived(baseScale * zoom);

  function resetView() {
    zoom = 1;
    panX = 0;
    panY = 0;
  }

  $effect(() => {
    if (imageSrc) {
      resetView();
    }
  });

  function handleImageLoad(e: Event) {
    const img = e.currentTarget as HTMLImageElement;
    naturalWidth = img.naturalWidth || 1;
    naturalHeight = img.naturalHeight || 1;
    resetView();
  }

  // Pointer drag handling for pan
  function handlePointerDown(e: MouseEvent | TouchEvent) {
    isDragging = true;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    startX = clientX;
    startY = clientY;
    startPanX = panX;
    startPanY = panY;

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
    window.addEventListener('touchmove', handlePointerMove, { passive: false });
    window.addEventListener('touchend', handlePointerUp);
  }

  function handlePointerMove(e: MouseEvent | TouchEvent) {
    if (!isDragging) return;
    if ('cancelable' in e && e.cancelable) {
      e.preventDefault();
    }
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const deltaX = clientX - startX;
    const deltaY = clientY - startY;

    // Constrain pan within reasonable boundaries based on current scale
    const maxPanX = Math.max(0, (naturalWidth * effectiveScale - CROP_SIZE) / 2);
    const maxPanY = Math.max(0, (naturalHeight * effectiveScale - CROP_SIZE) / 2);

    const nextX = startPanX + deltaX;
    const nextY = startPanY + deltaY;

    panX = Math.max(-maxPanX, Math.min(maxPanX, nextX));
    panY = Math.max(-maxPanY, Math.min(maxPanY, nextY));
  }

  function handlePointerUp() {
    isDragging = false;
    window.removeEventListener('mousemove', handlePointerMove);
    window.removeEventListener('mouseup', handlePointerUp);
    window.removeEventListener('touchmove', handlePointerMove);
    window.removeEventListener('touchend', handlePointerUp);
  }

  // Wheel zoom
  function handleWheel(e: WheelEvent) {
    e.preventDefault();
    const delta = e.deltaY * -0.002;
    zoom = Math.max(1, Math.min(3.5, Number((zoom + delta).toFixed(2))));
    const maxPanX = Math.max(0, (naturalWidth * effectiveScale - CROP_SIZE) / 2);
    const maxPanY = Math.max(0, (naturalHeight * effectiveScale - CROP_SIZE) / 2);
    panX = Math.max(-maxPanX, Math.min(maxPanX, panX));
    panY = Math.max(-maxPanY, Math.min(maxPanY, panY));
  }

  function applyCrop() {
    if (!imageElement) return;

    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // High quality rendering
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Ratio between rendered crop aperture and output canvas
    const outputRatio = OUTPUT_SIZE / CROP_SIZE;

    // Center of canvas
    ctx.save();
    ctx.translate(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2);

    // Apply pan and zoom to match preview
    const drawScale = effectiveScale * outputRatio;
    const drawX = panX * outputRatio;
    const drawY = panY * outputRatio;

    ctx.drawImage(
      imageElement,
      drawX - (naturalWidth * drawScale) / 2,
      drawY - (naturalHeight * drawScale) / 2,
      naturalWidth * drawScale,
      naturalHeight * drawScale
    );

    ctx.restore();

    // Export as PNG
    const dataUrl = canvas.toDataURL('image/png');
    // Extract raw base64 without prefix for backend
    const base64 = dataUrl.replace(/^data:image\/[a-z]+;base64,/, '');

    oncrop({ dataUrl, base64 });
    handleClose();
  }

  function handleClose() {
    open = false;
    onclose?.();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (open && e.key === 'Escape') {
      e.stopPropagation();
      handleClose();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-4"
    role="dialog"
    aria-modal="true"
    aria-labelledby="cropper-modal-title"
  >
    <!-- Backdrop -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
      onclick={handleClose}
    ></div>

    <!-- Modal Box -->
    <div
      class="relative w-full max-w-md rounded-xl border border-neutral-800 bg-neutral-900 text-neutral-100 shadow-2xl z-10 overflow-hidden flex flex-col"
    >
      <!-- Header -->
      <div class="flex items-center justify-between px-5 py-4 border-b border-neutral-800">
        <div>
          <h2 id="cropper-modal-title" class="text-sm font-semibold text-neutral-100 flex items-center gap-2">
            <span>Sesuaikan Foto Profil</span>
          </h2>
          <p class="text-xs text-neutral-400 mt-0.5">
            Geser dan atur perbesaran foto wajah Anda
          </p>
        </div>
        <button
          type="button"
          class="p-1 rounded-md text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
          onclick={handleClose}
          aria-label="Tutup pemotong foto"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Crop Viewport Container -->
      <div class="px-6 py-6 flex flex-col items-center select-none bg-neutral-950/60">
        <!-- Viewport with circular aperture overlay -->
        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
        <div
          class="relative overflow-hidden cursor-grab active:cursor-grabbing rounded-lg border border-neutral-800 bg-black flex items-center justify-center"
          style="width: 280px; height: 280px;"
          onmousedown={handlePointerDown}
          ontouchstart={handlePointerDown}
          onwheel={handleWheel}
          role="region"
          aria-label="Area potong foto profil (geser untuk mengatur posisi)"
        >
          <!-- Image being transformed -->
          <img
            bind:this={imageElement}
            src={imageSrc}
            alt="Pratinjau crop foto profil"
            onload={handleImageLoad}
            class="pointer-events-none absolute max-w-none transition-transform duration-75 ease-out"
            style="
              width: {naturalWidth * effectiveScale}px;
              height: {naturalHeight * effectiveScale}px;
              transform: translate({panX}px, {panY}px);
            "
            draggable="false"
          />

          <!-- Discord-style Circular Mask Overlay -->
          <div
            class="pointer-events-none absolute rounded-full border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.65)]"
            style="width: {CROP_SIZE}px; height: {CROP_SIZE}px;"
          >
            <!-- Crosshair center hint -->
            <div class="absolute inset-0 flex items-center justify-center opacity-25">
              <div class="w-full h-px border-t border-dashed border-white"></div>
              <div class="h-full w-px border-l border-dashed border-white absolute"></div>
            </div>
          </div>
        </div>

        <p class="text-[11px] text-neutral-400 mt-3 flex items-center gap-1">
          <Move class="w-3 h-3 text-neutral-500" />
          <span>Klik & geser foto untuk mengatur posisi wajah</span>
        </p>

        <!-- Zoom Slider Controls (Discord-like) -->
        <div class="w-full max-w-xs mt-5 flex items-center gap-3">
          <button
            type="button"
            class="p-1 text-neutral-400 hover:text-neutral-200 disabled:opacity-40 transition-colors"
            onclick={() => {
              zoom = Math.max(1, Number((zoom - 0.2).toFixed(2)));
              const maxPanX = Math.max(0, (naturalWidth * effectiveScale - CROP_SIZE) / 2);
              const maxPanY = Math.max(0, (naturalHeight * effectiveScale - CROP_SIZE) / 2);
              panX = Math.max(-maxPanX, Math.min(maxPanX, panX));
              panY = Math.max(-maxPanY, Math.min(maxPanY, panY));
            }}
            disabled={zoom <= 1}
            aria-label="Perkecil foto (Zoom out)"
          >
            <ZoomOut class="w-4 h-4" />
          </button>

          <input
            type="range"
            min="1"
            max="3"
            step="0.05"
            bind:value={zoom}
            aria-label="Tingkat zoom foto profil"
            class="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-[var(--brand)]"
            oninput={() => {
              const maxPanX = Math.max(0, (naturalWidth * effectiveScale - CROP_SIZE) / 2);
              const maxPanY = Math.max(0, (naturalHeight * effectiveScale - CROP_SIZE) / 2);
              panX = Math.max(-maxPanX, Math.min(maxPanX, panX));
              panY = Math.max(-maxPanY, Math.min(maxPanY, panY));
            }}
          />

          <button
            type="button"
            class="p-1 text-neutral-400 hover:text-neutral-200 disabled:opacity-40 transition-colors"
            onclick={() => {
              zoom = Math.min(3, Number((zoom + 0.2).toFixed(2)));
              const maxPanX = Math.max(0, (naturalWidth * effectiveScale - CROP_SIZE) / 2);
              const maxPanY = Math.max(0, (naturalHeight * effectiveScale - CROP_SIZE) / 2);
              panX = Math.max(-maxPanX, Math.min(maxPanX, panX));
              panY = Math.max(-maxPanY, Math.min(maxPanY, panY));
            }}
            disabled={zoom >= 3}
            aria-label="Perbesar foto (Zoom in)"
          >
            <ZoomIn class="w-4 h-4" />
          </button>

          <button
            type="button"
            class="p-1 text-neutral-400 hover:text-neutral-200 transition-colors ml-1"
            onclick={resetView}
            title="Reset Posisi & Zoom"
            aria-label="Reset Posisi dan Zoom"
          >
            <RotateCcw class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <!-- Footer Buttons -->
      <div class="px-5 py-3.5 border-t border-neutral-800 bg-neutral-900/90 flex items-center justify-end gap-2.5">
        <Button
          variant="secondary"
          size="sm"
          onclick={handleClose}
        >
          Batal
        </Button>
        <Button
          variant="primary"
          size="sm"
          onclick={applyCrop}
        >
          <Check class="w-3.5 h-3.5" />
          <span>Terapkan Foto</span>
        </Button>
      </div>
    </div>
  </div>
{/if}

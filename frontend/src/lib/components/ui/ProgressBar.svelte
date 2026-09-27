<script lang="ts">
  import { progress } from '../../stores/progress.svelte';
</script>

<div
  class="fixed top-0 left-0 right-0 z-[99999] pointer-events-none transition-opacity duration-300 ease-out"
  style:opacity={progress.visible ? 1 : 0}
  aria-hidden="true"
>
  <div
    class="h-[2.5px] transition-[width] duration-200 ease-out relative"
    style="
      width: {progress.progress}%;
      background: linear-gradient(90deg, var(--brand-action, #348eaa), var(--brand, #3f91ad));
      box-shadow: 0 0 10px var(--brand, #3f91ad), 0 0 4px var(--brand-action, #348eaa);
    "
  >
    <!-- Glowing peg at right tip matching KasirKu theme -->
    <div
      class="absolute right-0 top-0 bottom-0 w-24 h-full rotate-3 translate-x-1"
      style="
        box-shadow: 0 0 12px var(--brand, #3f91ad), 0 0 6px var(--brand-hover, #347e98);
      "
    ></div>
  </div>
</div>

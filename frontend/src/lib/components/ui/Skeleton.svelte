<script lang="ts">
  interface Props {
    class?: string;
    width?: string;
    height?: string;
  }

  let {
    class: className = '',
    width,
    height,
  }: Props = $props();
</script>

<div
  class="animate-pulse bg-neutral-200/70 dark:bg-neutral-800/80 rounded {className}"
  style:width={width}
  style:height={height}
></div>

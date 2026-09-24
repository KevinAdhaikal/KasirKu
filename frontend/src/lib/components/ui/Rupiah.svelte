<script lang="ts">
  import { splitRupiah } from '../../utils/format';

  interface Props {
    value: number | bigint | string | null | undefined;
    class?: string;
    prefixClass?: string;
    valueClass?: string;
  }

  let {
    value,
    class: className = '',
    prefixClass = 'text-[0.72em] font-semibold text-neutral-400 dark:text-neutral-500 mr-0.5 select-none',
    valueClass = ''
  }: Props = $props();

  let formatted = $derived(splitRupiah(value));
</script>

<span class="inline-flex items-baseline tabular-nums {className}">
  <span class={prefixClass}>{formatted.prefix}</span><span class={valueClass}>{formatted.value}</span>
</span>

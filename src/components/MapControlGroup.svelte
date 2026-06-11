<script lang="ts">
  import BackgroundMenu from './BackgroundMenu.svelte';
  import FullscreenButton from './FullscreenButton.svelte';
  import type { BackgroundType } from '../helpers/mapBackground';

  let {
    onBackgroundChange,
    orientation
  }: {
    onBackgroundChange: (bg: BackgroundType) => void;
    orientation: 'vertical' | 'horizontal';
  } = $props();
</script>

<div
  class={`flex gap-2 ${orientation === 'horizontal' ? 'flex-row' : 'flex-col'}`}
>
  <BackgroundMenu onchange={onBackgroundChange} />
  <FullscreenButton />
</div>

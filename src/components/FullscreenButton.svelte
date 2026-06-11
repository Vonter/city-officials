<script lang="ts">
  import { mapControlButtonClass } from '../helpers/styleUtils';
  import Icon from './Icon.svelte';

  let buttonEl: HTMLButtonElement;
  let isFullscreen = $state(false);

  const fullscreenSupported =
    typeof document !== 'undefined' &&
    (document.fullscreenEnabled ||
      (document as any).webkitFullscreenEnabled === true);

  function fullscreenElement(): Element | null {
    return (
      document.fullscreenElement ??
      (document as any).webkitFullscreenElement ??
      null
    );
  }

  function syncFullscreenState() {
    isFullscreen = fullscreenElement() !== null;
  }

  function toggle() {
    if (fullscreenElement()) {
      const exit =
        document.exitFullscreen ?? (document as any).webkitExitFullscreen;
      exit?.call(document);
    } else {
      const target = buttonEl.closest('.maplibregl-map') as any;
      if (!target) return;
      const request = target.requestFullscreen ?? target.webkitRequestFullscreen;
      request?.call(target);
    }
  }

  $effect(() => {
    document.addEventListener('fullscreenchange', syncFullscreenState);
    document.addEventListener('webkitfullscreenchange', syncFullscreenState);
    return () => {
      document.removeEventListener('fullscreenchange', syncFullscreenState);
      document.removeEventListener(
        'webkitfullscreenchange',
        syncFullscreenState
      );
    };
  });
</script>

{#if fullscreenSupported}
  <button
    bind:this={buttonEl}
    onclick={toggle}
    type="button"
    aria-label={isFullscreen ? 'Exit fullscreen' : 'View map fullscreen'}
    class={mapControlButtonClass}
  >
    <Icon
      name={isFullscreen ? 'fullscreen-exit' : 'fullscreen'}
      class="w-4 h-4"
    />
  </button>
{/if}

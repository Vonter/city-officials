<script lang="ts">
  import {
    BACKGROUND_OPTIONS,
    type BackgroundType,
    selectedBackgroundStore
  } from '../helpers/mapBackground';
  import { mapControlButtonClass } from '../helpers/styleUtils';
  import Icon from './Icon.svelte';

  let { onchange }: { onchange: (bg: BackgroundType) => void } = $props();

  let isOpen = $state(false);
  let containerEl: HTMLDivElement;
  let buttonEl: HTMLButtonElement;
  let menuAbove = $state(false);

  function toggle() {
    isOpen = !isOpen;
    if (isOpen && buttonEl) {
      const rect = buttonEl.getBoundingClientRect();
      menuAbove = rect.top > window.innerHeight * 0.25;
    }
  }

  function select(bg: BackgroundType) {
    $selectedBackgroundStore = bg;
    onchange(bg);
    isOpen = false;
  }

  function handleDocumentClick(e: MouseEvent) {
    if (containerEl && !containerEl.contains(e.target as Node)) {
      isOpen = false;
    }
  }
</script>

<svelte:document onclick={handleDocumentClick} />

<div bind:this={containerEl} class="relative map-layers-control">
  <button
    bind:this={buttonEl}
    onclick={toggle}
    type="button"
    aria-label="Select map background"
    class={mapControlButtonClass}
  >
    <Icon name="layers" class="w-4 h-4" />
  </button>

  {#if isOpen}
    <div
      class="absolute w-40 bg-white shadow-md rounded border border-gray-200 dark:bg-neutral-800 dark:border-neutral-700 z-50 py-1 font-sans left-0"
      class:bottom-full={menuAbove}
      class:mb-2={menuAbove}
      class:top-full={!menuAbove}
      class:mt-2={!menuAbove}
      role="menu"
    >
      {#each BACKGROUND_OPTIONS as option}
        {@const isSelected = $selectedBackgroundStore === option.id}
        <button
          type="button"
          role="menuitem"
          onclick={() => select(option.id)}
          class={`w-full text-left px-3 py-2 text-sm flex items-center justify-between focus:outline-none transition-colors ${
            isSelected
              ? 'text-blue-600 bg-blue-50 hover:!bg-blue-50 dark:text-blue-400 dark:bg-blue-900/30 dark:hover:!bg-blue-900/30'
              : 'text-gray-700 dark:text-gray-300 hover:!bg-gray-50 dark:hover:!bg-neutral-700/60'
          }`}
        >
          <span>{option.label}</span>
          {#if isSelected}
            <Icon name="check" class="w-4 h-4" />
          {/if}
        </button>
      {/each}
    </div>
  {/if}
</div>

<script lang="ts">
  import { addMessages, init } from 'svelte-i18n';
  import {
    seedDepartmentBoundary,
    prefetchAllBoundaries,
    loadOfficialsData
  } from '../stores';
  import Map from './Map.svelte';
  import Sidebar from './Sidebar/Sidebar.svelte';
  import Controls from './Controls.svelte';
  import { locales } from '../configs/config';
  import { onMount } from 'svelte';
  import { scheduleIdle } from '../helpers/scheduling';

  interface Props {
    prefetchedDepartment: string | null;
    prefetchedDepartmentData: any;
    initialLocale: string;
  }

  let { prefetchedDepartment, prefetchedDepartmentData, initialLocale }: Props =
    $props();

  if (prefetchedDepartment && prefetchedDepartmentData) {
    seedDepartmentBoundary(prefetchedDepartment, prefetchedDepartmentData);
  }

  onMount(() => {
    loadOfficialsData();
    scheduleIdle(() => prefetchAllBoundaries());
  });

  Object.entries(locales).forEach(([code, messages]) => {
    addMessages(code, messages);
  });
  init({
    fallbackLocale: 'en',
    initialLocale
  });
</script>

<main
  class="flex flex-col md:flex-row h-full absolute inset-0 dark:bg-neutral-900"
>
  <Sidebar />
  <div class="relative flex-1 order-first md:order-last">
    <Map />
    <div
      class="md:absolute md:inset-x-3 md:top-3 absolute inset-x-0 bottom-0 p-3 pointer-events-none"
    >
      <div class="pointer-events-auto">
        <Controls />
      </div>
    </div>
  </div>
</main>

<style>
  @media (max-width: 768px) {
    :global(.maplibregl-ctrl-bottom-right),
    :global(.maplibregl-ctrl-bottom-left) {
      display: none;
    }

    :global(.maplibregl-map:fullscreen .map-layers-control) {
      display: none;
    }

    /* Separate rule: a :-webkit-full-screen selector in the list above would
       invalidate it in browsers that don't recognize the prefix */
    :global(.maplibregl-map:-webkit-full-screen .map-layers-control) {
      display: none;
    }
  }

  @media (min-width: 768px) {
    :global(.maplibregl-ctrl-top-right),
    :global(.maplibregl-ctrl-top-left) {
      display: none;
    }
  }
</style>

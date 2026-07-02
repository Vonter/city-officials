<script lang="ts">
  import { allCityConfigs, allCityIds, cityConfig } from '../../configs/config';
  import { showCitySelector } from '../../stores';
  import SidebarHeader from './SidebarHeader.svelte';

  const cityDisplayNames: Record<string, string> = {
    blr: 'Bengaluru',
    mumbai: 'Mumbai',
    pune: 'Pune',
    chennai: 'Chennai',
    kolkata: 'Kolkata',
    hyd: 'Hyderabad',
    delhi: 'Delhi',
    vizag: 'Vizag'
  };

  const cities = allCityIds
    .map(id => ({
      id,
      name: cityDisplayNames[id] || allCityConfigs[id].seo.title
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  function selectCity(cityId: string) {
    showCitySelector.set(false);
    window.location.href = `/${cityId}`;
  }
</script>

<SidebarHeader title="Select City" onBack={() => showCitySelector.set(false)} />

<div class="py-2 dark:bg-neutral-900">
  {#each cities as city}
    <button
      onclick={() => selectCity(city.id)}
      class="block w-full text-left py-2.5 px-4 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors {city.id ===
      cityConfig.cityId
        ? 'bg-blue-50 dark:bg-neutral-800'
        : ''}"
    >
      <span
        class="font-medium {city.id === cityConfig.cityId
          ? 'text-blue-600 dark:text-blue-400'
          : 'text-gray-900 dark:text-gray-100'}"
      >
        {city.name}
      </span>
    </button>
  {/each}
</div>

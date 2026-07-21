<script lang="ts">
  import { _, locale } from 'svelte-i18n';
  import { fromStore } from 'svelte/store';
  import { selectedBoundaryMap } from '../../stores';
  import { layers } from '../../assets/boundaries';
  import { cityConfig, isAllCitiesMode } from '../../configs/config';
  import { showCitySelector } from '../../stores';
  import { getGroupKey, findLowestLevelKey } from '../../helpers/departmentGroup';
  import { alternatingRowClass } from '../../helpers/styleUtils';
  import SidebarHeader from './SidebarHeader.svelte';
  import ShareButton from '../ShareButton.svelte';

  const t = fromStore(_);
  const loc = fromStore(locale);

  function toggleLanguage() {
    const currentIndex = cityConfig.supportedLanguages.findIndex(
      lang => lang.code === loc.current?.split('-')[0]
    );
    const nextIndex = (currentIndex + 1) % cityConfig.supportedLanguages.length;
    loc.current = cityConfig.supportedLanguages[nextIndex]?.code;
  }

  function getNextLanguageName() {
    const currentIndex = cityConfig.supportedLanguages.findIndex(
      lang => lang.code === loc.current?.split('-')[0]
    );
    const nextIndex = (currentIndex + 1) % cityConfig.supportedLanguages.length;
    const nextLanguage = cityConfig.supportedLanguages[nextIndex];
    return t.current(nextLanguage?.nameKey || '');
  }

  interface DepartmentGroup {
    prefix: string;
    groupNameKey: string;
    icon: string;
    keys: string[];
  }

  const departmentGroups = $derived.by(() => {
    const allKeys = Object.keys(layers);
    const groupOrderMap = new Map<string, DepartmentGroup>();

    for (const key of allKeys) {
      const groupKey = getGroupKey(key);
      if (groupOrderMap.has(groupKey)) {
        groupOrderMap.get(groupKey)!.keys.push(key);
      } else {
        groupOrderMap.set(groupKey, {
          prefix: groupKey,
          groupNameKey: `group_${groupKey}`,
          icon: layers[key].icon,
          keys: [key]
        });
      }
    }

    const groups = [...groupOrderMap.values()];
    const isLast = (g: DepartmentGroup) =>
      g.keys.some(key => layers[key]?.sidebarLast);
    return [
      ...groups.filter(g => !isLast(g)),
      ...groups.filter(g => isLast(g))
    ];
  });
</script>

<SidebarHeader
  title={t.current('sidebar_title')}
  logoUrl={cityConfig.logo}
  onTitleClick={isAllCitiesMode ? () => showCitySelector.set(true) : undefined}
>
  <ShareButton />
  <button
    class="px-2 py-1 rounded text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-neutral-800 focus:outline-none"
    onclick={toggleLanguage}
  >
    {getNextLanguageName()}
  </button>
</SidebarHeader>

<div class="py-4 dark:bg-neutral-900">
  <div class="text-gray-600 dark:text-gray-400 mb-4 px-4">
    {t.current('introduction')}
  </div>
  {#each departmentGroups as group, index}
    <div class={alternatingRowClass(index)}>
      {#if group.keys.length === 1}
        <button
          onclick={() => selectedBoundaryMap.set(group.keys[0])}
          class="block py-1.5 px-4 w-full text-left hover:bg-gray-200 dark:hover:bg-neutral-700"
        >
          <span class="mr-1">{group.icon}</span>
          {t.current(layers[group.keys[0]].nameKey || '')}
        </button>
      {:else}
        <button
          onclick={() => selectedBoundaryMap.set(findLowestLevelKey(group.keys))}
          class="block py-1.5 px-4 w-full text-left dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-neutral-700"
        >
          <span class="mr-1">{group.icon}</span>
          {t.current(group.groupNameKey)}
        </button>
      {/if}
    </div>
  {/each}
</div>

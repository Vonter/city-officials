<script lang="ts">
  import { untrack } from 'svelte';
  import { _, locale } from 'svelte-i18n';
  import { fromStore } from 'svelte/store';
  import SidebarHeader from './SidebarHeader.svelte';
  import {
    mapStore,
    addressMarker,
    coordinatesMarker,
    selectedCoordinates,
    allBoundaries,
    officialsData
  } from '../../stores';
  import OverlapList from './OverlapList.svelte';
  import OfficialCard from './OfficialCard.svelte';
  import type { Feature } from 'geojson';
  import type { LngLat } from 'maplibre-gl';
  import maplibregl from 'maplibre-gl';
  import { getOfficialDetails, resetZoom } from '../../helpers/helpers';
  import { getLocalizedDistrictName } from '../../helpers/districtDisplay';
  import { layers } from '../../assets/boundaries';
  import PolygonLookup from 'polygon-lookup';
  import { api } from '../../helpers/api';
  import ShareButton from '../ShareButton.svelte';

  const BLO_DEPARTMENT = 'polling_booth';

  const t = fromStore(_);
  const loc = fromStore(locale);
  const coords$ = fromStore(selectedCoordinates);
  const map$ = fromStore(mapStore);
  const addrMarker$ = fromStore(addressMarker);
  const coordMarker$ = fromStore(coordinatesMarker);
  const boundaries$ = fromStore(allBoundaries);
  const officials$ = fromStore(officialsData);

  let districtsIntersectingAddress: Feature[] = $state([]);
  let isLoading = $state(false);
  let lookup: any = null;

  const boothFeature = $derived(
    districtsIntersectingAddress.find(
      d => d.properties?.['id'] === BLO_DEPARTMENT
    ) ?? null
  );

  const boothName = $derived(
    boothFeature
      ? getLocalizedDistrictName(
          BLO_DEPARTMENT,
          boothFeature.properties?.['namecol'],
          officials$.current,
          loc.current
        )
      : ''
  );

  const bloOfficial = $derived.by(() => {
    if (!boothFeature) return null;
    const officials = getOfficialDetails(
      BLO_DEPARTMENT,
      boothFeature.properties?.['namecol'],
      officials$.current
    );
    return officials && officials.length > 0 ? officials[0] : null;
  });

  const overlapDistricts = $derived(
    districtsIntersectingAddress.filter(
      d => d.properties?.['id'] !== BLO_DEPARTMENT
    )
  );

  let prevAllBoundariesRef: any = null;

  async function queryAllDistrictsForCoordinates(lngLat: LngLat) {
    districtsIntersectingAddress = [];
    isLoading = true;

    try {
      // Use monolithic allBoundaries if loaded (from background prefetch)
      if (boundaries$.current) {
        // Rebuild lookup if allBoundaries changed
        if (boundaries$.current !== prevAllBoundariesRef) {
          lookup = new PolygonLookup(boundaries$.current);
          prevAllBoundariesRef = boundaries$.current;
        }
        const searchResults = lookup.search(lngLat.lng, lngLat.lat, -1);
        districtsIntersectingAddress = searchResults.features;
      } else {
        // Fallback to API if all boundaries not yet loaded
        const coordinateDetails = await api.getCoordinateDetails(lngLat);

        if (coordinateDetails) {
          districtsIntersectingAddress = coordinateDetails.districts.map(
            (d: any) =>
              ({
                type: 'Feature',
                properties: {
                  id: d.id,
                  namecol: d.namecol,
                  wardName: d.wardName,
                  boundaryNumber: d.boundaryNumber
                },
                geometry: null
              }) as unknown as Feature
          );
        } else {
          console.error('Failed to get coordinate details');
          districtsIntersectingAddress = [];
        }
      }
    } catch (error) {
      console.error('Error getting coordinate details:', error);
      districtsIntersectingAddress = [];
    } finally {
      isLoading = false;
    }
  }

  function getCoordinateTitle(lngLat: LngLat | null) {
    return lngLat ? `${lngLat.lat}, ${lngLat.lng}` : 'Search by location';
  }

  function handleBack() {
    selectedCoordinates.set(null);
    if (coordMarker$.current) coordMarker$.current.remove();
    if (map$.current) {
      resetZoom(map$.current);
    }
  }

  let lastCoordKey = '';

  $effect(() => {
    const coords = coords$.current;
    if (!coords) return;

    const coordKey = `${coords.lat},${coords.lng}`;
    if (coordKey === lastCoordKey) return;
    lastCoordKey = coordKey;

    untrack(() => {
      queryAllDistrictsForCoordinates(coords);
    });
  });

  $effect(() => {
    const coords = coords$.current;
    const map = map$.current;
    if (!map || !coords) return;

    untrack(() => {
      map.flyTo({ center: coords, zoom: 15, duration: 1500 });

      if (addrMarker$.current) addrMarker$.current.remove();
      if (coordMarker$.current) coordMarker$.current.remove();
      coordMarker$.current = new maplibregl.Marker({ color: '#2463eb' })
        .setLngLat(coords)
        .addTo(map);
    });
  });
</script>

<SidebarHeader title={getCoordinateTitle(coords$.current)} onBack={handleBack}>
  {#snippet children()}
    <ShareButton title={getCoordinateTitle(coords$.current)} />
  {/snippet}
</SidebarHeader>
{#if coords$.current && boothFeature}
  <div class="px-4 pt-3">
    <div class="flex items-center gap-2 mb-2">
      <span>{layers[BLO_DEPARTMENT]?.icon}</span>
      <span class="text-sm font-medium text-gray-900 dark:text-gray-100">
        {t.current(layers[BLO_DEPARTMENT]?.nameKey || '')}
      </span>
    </div>
    <div class="text-sm text-gray-700 dark:text-gray-300 mb-2 px-1">
      {boothName}
    </div>
    {#if bloOfficial}
      <OfficialCard official={bloOfficial} locale={loc.current} />
    {/if}
  </div>
{/if}
<div class="py-2">
  {#if coords$.current}
    <OverlapList districts={overlapDistricts} {isLoading} />
  {/if}
</div>

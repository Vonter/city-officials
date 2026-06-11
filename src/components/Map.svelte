<script lang="ts">
  import { untrack } from 'svelte';
  import { fromStore } from 'svelte/store';
  import { browser } from '$app/environment';
  import { get } from 'svelte/store';
  import {
    selectedBoundaryMap,
    selectedDistrict,
    selectedCoordinates,
    mapStore,
    hoveredDistrictId,
    departmentBoundaries,
    departmentCenterpoints,
    loadDepartmentBoundary,
    isMapReady,
    darkMode
  } from '../stores';
  import type { FeatureCollection } from 'geojson';
  import 'maplibre-gl/dist/maplibre-gl.css';
  import { defaultZoom, zoomToBound } from '../helpers/helpers';
  import { colors, getBoundaryColor } from '../helpers/colors';
  import { cityConfig } from '../configs/config';
  import {
    changeMapBackground,
    getDefaultBackgroundStyle,
    type BackgroundType
  } from '../helpers/mapBackground';
  import { createMapControlGroup } from '../helpers/mapControls';
  import { wardLabelExpression } from '../helpers/mapLayers';
  import { scheduleIdle as scheduleIdleFn } from '../helpers/scheduling';
  import {
    updateHoverFeature,
    setHoverState
  } from '../helpers/mapFeatureState';

  let maplibregl: any;
  let turfBbox: typeof import('@turf/bbox').default;

  const _selectedBoundaryMap = fromStore(selectedBoundaryMap);
  const _selectedDistrict = fromStore(selectedDistrict);
  const _mapStore = fromStore(mapStore);
  const _hoveredDistrictId = fromStore(hoveredDistrictId);
  const _departmentBoundaries = fromStore(departmentBoundaries);
  const _departmentCenterpoints = fromStore(departmentCenterpoints);
  const _isMapReady = fromStore(isMapReady);
  const _darkMode = fromStore(darkMode);

  let map: import('maplibre-gl').Map;
  let currentSourceDeptId: string | null = null;
  let prevLayerId: string | null = null;
  let currentBackground: BackgroundType = 'default';
  let prevDarkMode: boolean | undefined;
  let prevSelectedDistrictId: string | null = null;

  // Store event handler references for cleanup (item 9)
  let activeHandlers: {
    boundaryId: string;
    mousemove: (e: any) => void;
    mouseleave: () => void;
    click: (e: any) => void;
  } | null = null;

  async function loadTurfBbox() {
    if (!turfBbox) {
      const mod = await import('@turf/bbox');
      turfBbox = mod.default;
    }
    return turfBbox;
  }

  function getDeptBoundaries(deptId: string): FeatureCollection | null {
    const deptMap = _departmentBoundaries.current;
    return deptMap.get(deptId) ?? null;
  }

  function getDeptCenterpoints(deptId: string): FeatureCollection | null {
    const cpMap = _departmentCenterpoints.current;
    return cpMap.get(deptId) ?? null;
  }

  function styleBasemapLabels(m: import('maplibre-gl').Map, dark: boolean) {
    if (m.getLayer('place_villages')) {
      m.setLayoutProperty('place_villages', 'text-font', [
        'Montserrat Regular',
        'Open Sans Regular',
        'Noto Sans Regular',
        'HanWangHeiLight Regular',
        'NanumBarunGothic Regular'
      ]);
      m.setLayoutProperty('place_villages', 'text-size', {
        stops: [
          [12, 9],
          [13, 10],
          [14, 11],
          [15, 12],
          [16, 13]
        ]
      });
      m.setLayoutProperty('place_villages', 'text-transform', {
        stops: [
          [8, 'none'],
          [12, 'uppercase']
        ]
      });
      m.setPaintProperty(
        'place_villages',
        'text-color',
        dark ? '#666' : '#697b89'
      );
      m.setLayerZoomRange('place_villages', 12, 16);
    }
    if (m.getLayer('place_hamlet')) {
      m.setFilter('place_hamlet', ['==', 'class', 'neighbourhood']);
    }
  }

  function applyMapStyle(background: BackgroundType, dark: boolean) {
    if (!map) return;
    currentSourceDeptId = null;
    prevLayerId = null;
    changeMapBackground(map, background, dark, () => {
      styleBasemapLabels(map, dark);
      if (_selectedBoundaryMap.current) {
        addSourceAndShow(_selectedBoundaryMap.current);
      }
    });
  }

  async function addSourceAndShow(boundaryId: string) {
    if (!map) return;

    let deptData = getDeptBoundaries(boundaryId);
    if (!deptData) {
      deptData = await loadDepartmentBoundary(boundaryId);
    }
    if (!deptData) return;

    addSourceForDepartment(boundaryId, deptData);
    showMap(boundaryId);
    if (_selectedDistrict.current) {
      updateDistrictVisuals(_selectedDistrict.current);
    }
  }

  function addCenterpointSource(deptId: string) {
    if (!map) return;
    const sourceId = `boundaries-${deptId}-centerpoints`;
    if (map.getSource(sourceId)) return;
    const centerpoints = getDeptCenterpoints(deptId);
    if (!centerpoints) return;
    map.addSource(sourceId, { type: 'geojson', data: centerpoints });
  }

  function addLabelLayer(boundaryId: string) {
    if (!map) return;
    const sourceId = `boundaries-${boundaryId}-centerpoints`;
    const layerId = `${boundaryId}-label-layer`;
    if (!map.getSource(sourceId) || map.getLayer(layerId)) return;

    map.addLayer({
      id: layerId,
      type: 'symbol',
      source: sourceId,
      paint: {
        'text-color': getBoundaryColor(boundaryId, _darkMode.current),
        'text-halo-color': _darkMode.current
          ? 'rgba(0,0,0,0.4)'
          : 'rgba(255,255,255,0.95)',
        'text-halo-width': _darkMode.current ? 2 : 2.5
      },
      layout: {
        'text-field': wardLabelExpression,
        'text-size': ['interpolate', ['linear'], ['zoom'], 11, 12.5, 32, 60]
      }
    });
  }

  function addSourceForDepartment(deptId: string, deptData: FeatureCollection) {
    if (!map) return;

    const sourceId = `boundaries-${deptId}`;
    if (map.getSource(sourceId)) {
      currentSourceDeptId = deptId;
      return;
    }

    map.addSource(sourceId, {
      type: 'geojson',
      promoteId: 'namecol',
      data: deptData
    });

    addCenterpointSource(deptId);

    currentSourceDeptId = deptId;
  }

  function removeSourceForDepartment(deptId: string) {
    if (!_mapStore.current) return;
    const sourceId = `boundaries-${deptId}`;
    if (_mapStore.current.getSource(`${sourceId}-centerpoints`)) {
      _mapStore.current.removeSource(`${sourceId}-centerpoints`);
    }
    if (_mapStore.current.getSource(sourceId)) {
      _mapStore.current.removeSource(sourceId);
    }
  }

  function handleBackgroundChange(background: BackgroundType) {
    if (!map) return;
    currentBackground = background;
    applyMapStyle(background, _darkMode.current);
  }

  function computeInitialView(): Partial<import('maplibre-gl').MapOptions> {
    const boundaryId = get(selectedBoundaryMap);
    const districtId = get(selectedDistrict);
    const coords = get(selectedCoordinates);

    if (boundaryId && districtId) {
      const deptData = getDeptBoundaries(boundaryId);
      if (deptData) {
        const features = deptData.features.filter(
          f =>
            f.properties?.['namecol']?.toLowerCase() ===
              districtId.toLowerCase() &&
            f.properties?.['id']?.toLowerCase() === boundaryId.toLowerCase()
        );
        if (features.length > 0) {
          let minLng = Infinity,
            minLat = Infinity,
            maxLng = -Infinity,
            maxLat = -Infinity;
          for (const f of features) {
            const coords =
              f.geometry.type === 'Polygon'
                ? [f.geometry.coordinates]
                : f.geometry.type === 'MultiPolygon'
                  ? f.geometry.coordinates
                  : [];
            for (const poly of coords) {
              for (const ring of poly) {
                for (const [lng, lat] of ring) {
                  if (lng < minLng) minLng = lng;
                  if (lat < minLat) minLat = lat;
                  if (lng > maxLng) maxLng = lng;
                  if (lat > maxLat) maxLat = lat;
                }
              }
            }
          }
          if (minLng !== Infinity) {
            const lngSpan = maxLng - minLng;
            const latSpan = maxLat - minLat;
            const maxSpan = Math.max(lngSpan, latSpan);
            const zoom = Math.min(15, Math.floor(Math.log2(360 / maxSpan)) - 1);
            return {
              center: [(minLng + maxLng) / 2, (minLat + maxLat) / 2] as [
                number,
                number
              ],
              zoom: Math.max(9, zoom)
            };
          }
        }
      }
    }

    if (coords) {
      return { center: [coords.lng, coords.lat] as [number, number], zoom: 13 };
    }

    return defaultZoom;
  }

  function initMap(container: any) {
    if (!browser) return;

    const init = async () => {
      if (get(selectedDistrict)) loadTurfBbox();

      const mod = await import('maplibre-gl');
      maplibregl = mod.default;

      const initialView = computeInitialView();

      map = new maplibregl.Map({
        container,
        style: getDefaultBackgroundStyle(_darkMode.current),
        minZoom: 9,
        maxZoom: cityConfig.map.maxZoom ?? 18,
        ...(cityConfig.map.maxBounds && {
          maxBounds: cityConfig.map.maxBounds
        }),
        ...initialView
      });

      const attributionControl = new maplibregl.AttributionControl();
      map.addControl(attributionControl, 'top-right');

      map.dragRotate.disable();
      map.keyboard.disable();
      map.touchZoomRotate.disableRotation();

      window.addEventListener(
        'keydown',
        e => {
          if (e.metaKey && (e.key === '=' || e.key === '-')) {
            e.preventDefault();
            e.key === '=' && map.zoomIn();
            e.key === '-' && map.zoomOut();
          }
        },
        true
      );

      map.on('load', () => {
        _mapStore.current = map;
        map.resize();

        if (map.getLayer('boundary_county')) {
          map.removeLayer('boundary_county');
        }

        scheduleIdleFn(() => styleBasemapLabels(map, _darkMode.current));

        const controlGroupTop = createMapControlGroup(
          handleBackgroundChange,
          'vertical'
        );
        const controlGroupBottom = createMapControlGroup(
          handleBackgroundChange,
          'horizontal'
        );
        map.addControl(controlGroupTop, 'top-left');
        map.addControl(controlGroupBottom, 'bottom-left');

        isMapReady.set(true);
      });

      map.on('click', e => {
        if (!_selectedBoundaryMap.current) {
          selectedCoordinates.set({
            lat: e.lngLat.lat.toFixed(5),
            lng: e.lngLat.lng.toFixed(5)
          });
        }
      });
    };

    init();

    return {
      destroy: () => {
        map?.remove();
        _mapStore.current = map;
      }
    };
  }

  function removeLayerHandlers() {
    if (activeHandlers && _mapStore.current) {
      const layerId = `${activeHandlers.boundaryId}-layer`;
      _mapStore.current.off('mousemove', layerId, activeHandlers.mousemove);
      _mapStore.current.off('mouseleave', layerId, activeHandlers.mouseleave);
      _mapStore.current.off('click', layerId, activeHandlers.click);
      activeHandlers = null;
    }
  }

  function clearMap() {
    removeLayerHandlers();
    if (_mapStore.current && prevLayerId) {
      _mapStore.current.getLayer(`${prevLayerId}-layer`) &&
        _mapStore.current.removeLayer(`${prevLayerId}-layer`);

      _mapStore.current.getLayer(`${prevLayerId}-stroke-layer`) &&
        _mapStore.current.removeLayer(`${prevLayerId}-stroke-layer`);

      _mapStore.current.getLayer(`${prevLayerId}-label-layer`) &&
        _mapStore.current.removeLayer(`${prevLayerId}-label-layer`);
    }
  }

  function showMap(boundaryId: string) {
    clearMap();

    const sourceId = `boundaries-${boundaryId}`;

    if (_mapStore.current && _mapStore.current.getSource(sourceId)) {
      _mapStore.current
        .addLayer({
          id: `${boundaryId}-layer`,
          type: 'fill',
          source: sourceId,
          paint: {
            'fill-color': [
              'case',
              ['boolean', ['feature-state', 'selected'], false],
              getBoundaryColor(boundaryId, _darkMode.current),
              ['boolean', ['feature-state', 'hover'], false],
              getBoundaryColor(boundaryId, _darkMode.current),
              _darkMode.current ? colors['dark-selected'] : colors['selected']
            ],
            'fill-opacity': [
              'case',
              ['boolean', ['feature-state', 'selected'], false],
              _darkMode.current ? 0.2 : 0.4,
              ['boolean', ['feature-state', 'hover'], false],
              _darkMode.current ? 0.15 : 0.25,
              _darkMode.current ? 0.01 : 0.1
            ]
          }
        })
        .addLayer({
          id: `${boundaryId}-stroke-layer`,
          type: 'line',
          source: sourceId,
          paint: {
            'line-color': getBoundaryColor(boundaryId, _darkMode.current),
            'line-width': [
              'case',
              [
                'any',
                ['boolean', ['feature-state', 'hover'], false],
                ['boolean', ['feature-state', 'selected'], false]
              ],
              _darkMode.current ? 2 : 2.5,
              _darkMode.current ? 1 : 1.5
            ]
          }
        });

      addLabelLayer(boundaryId);

      const mousemoveHandler = (e: any) => {
        _mapStore.current.getCanvas().style.cursor = 'pointer';

        if (e.features && e.features.length > 0) {
          const newId = e.features[0].properties?.namecol;
          updateHoverFeature(
            _mapStore.current,
            sourceId,
            _hoveredDistrictId.current,
            newId
          );
          _hoveredDistrictId.current = newId;
        }
      };

      const mouseleaveHandler = () => {
        _mapStore.current.getCanvas().style.cursor = '';
        setHoverState(
          _mapStore.current,
          sourceId,
          _hoveredDistrictId.current,
          false
        );
        hoveredDistrictId.set(undefined);
      };

      const clickHandler = async (e: any) => {
        if (e.features && e.features.length > 0) {
          const namecol = e.features[0].properties?.namecol;
          if (namecol) {
            _selectedDistrict.current = namecol;
            const bbox = await loadTurfBbox();
            zoomToBound(_mapStore.current, bbox(e.features[0]));
          }
        }
      };

      _mapStore.current.on(
        'mousemove',
        `${boundaryId}-layer`,
        mousemoveHandler
      );
      _mapStore.current.on(
        'mouseleave',
        `${boundaryId}-layer`,
        mouseleaveHandler
      );
      _mapStore.current.on('click', `${boundaryId}-layer`, clickHandler);

      activeHandlers = {
        boundaryId,
        mousemove: mousemoveHandler,
        mouseleave: mouseleaveHandler,
        click: clickHandler
      };
    }

    prevLayerId = boundaryId;
  }

  async function updateDistrictVisuals(
    districtId: string | null,
    skipZoom: boolean = false
  ) {
    if (!_mapStore.current || !currentSourceDeptId) return;

    const sourceId = `boundaries-${currentSourceDeptId}`;
    const deptData = getDeptBoundaries(currentSourceDeptId);

    if (_mapStore.current.getSource(sourceId) && prevSelectedDistrictId) {
      _mapStore.current.setFeatureState(
        { source: sourceId, id: prevSelectedDistrictId },
        { selected: false }
      );
    }

    if (
      _selectedBoundaryMap.current &&
      districtId &&
      _mapStore.current.getSource(sourceId)
    ) {
      if (!skipZoom && deptData) {
        const matchingFeatures = deptData.features.filter(f => {
          return (
            f.properties?.namecol.toLowerCase() === districtId?.toLowerCase() &&
            f.properties?.id.toLowerCase() ===
              _selectedBoundaryMap.current?.toLowerCase()
          );
        });
        if (matchingFeatures.length > 0) {
          const bbox = await loadTurfBbox();
          const combinedBbox = bbox({
            type: 'FeatureCollection',
            features: matchingFeatures
          });
          zoomToBound(_mapStore.current, combinedBbox);
        }
      }

      _mapStore.current.setFeatureState(
        { source: sourceId, id: districtId },
        { selected: true }
      );
    }

    prevSelectedDistrictId = districtId;
  }

  $effect(() => {
    if (_isMapReady.current && _selectedBoundaryMap.current) {
      const boundaryId = _selectedBoundaryMap.current;
      untrack(() => addSourceAndShow(boundaryId));
    }
  });

  $effect(() => {
    const boundaryMap = _selectedBoundaryMap.current;
    untrack(() => {
      if (!boundaryMap) {
        clearMap();
        if (currentSourceDeptId) {
          removeSourceForDepartment(currentSourceDeptId);
          currentSourceDeptId = null;
        }
      }
    });
  });

  $effect(() => {
    const district = _selectedDistrict.current;
    untrack(() => {
      if (currentSourceDeptId) {
        updateDistrictVisuals(district);
      }
    });
  });

  $effect(() => {
    const cpMap = _departmentCenterpoints.current;
    untrack(() => {
      if (!map || !currentSourceDeptId) return;
      if (!cpMap.has(currentSourceDeptId)) return;
      addCenterpointSource(currentSourceDeptId);
      addLabelLayer(currentSourceDeptId);
    });
  });

  $effect(() => {
    const dm = _darkMode.current;
    untrack(() => {
      if (!map || dm === prevDarkMode) {
        prevDarkMode = dm;
        return;
      }
      prevDarkMode = dm;
      if (currentBackground === 'default') {
        applyMapStyle('default', dm);
      }
    });
  });
</script>

<div id="map" class="flex-1 h-full" use:initMap></div>

import type { Map } from 'maplibre-gl';
import { writable } from 'svelte/store';

export type BackgroundType = 'default' | 'satellite' | 'osm';

export interface BackgroundOption {
  id: BackgroundType;
  label: string;
}

export const BACKGROUND_OPTIONS: BackgroundOption[] = [
  { id: 'default', label: 'Default' },
  { id: 'satellite', label: 'Satellite' },
  { id: 'osm', label: 'OpenStreetMap' }
];

export const selectedBackgroundStore = writable<BackgroundType>('default');

export function getDefaultBackgroundStyle(darkMode: boolean): string {
  return darkMode
    ? 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
    : 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';
}

export function getBackgroundStyle(
  background: BackgroundType,
  darkMode: boolean
): any {
  if (background === 'satellite') {
    return {
      version: 8,
      sources: {
        satellite: {
          type: 'raster',
          tiles: [
            'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
          ],
          tileSize: 256,
          attribution: '\u00A9 Esri'
        }
      },
      layers: [
        {
          id: 'satellite-layer',
          type: 'raster',
          source: 'satellite',
          minzoom: 0,
          maxzoom: 22,
          paint: { 'raster-opacity': 0.5 }
        }
      ],
      glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf'
    };
  } else if (background === 'osm') {
    return {
      version: 8,
      sources: {
        osm: {
          type: 'raster',
          tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
          tileSize: 256,
          attribution: '\u00A9 OpenStreetMap contributors'
        }
      },
      layers: [
        {
          id: 'osm-layer',
          type: 'raster',
          source: 'osm',
          minzoom: 0,
          maxzoom: 19,
          paint: { 'raster-opacity': 0.5 }
        }
      ],
      glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf'
    };
  } else {
    return getDefaultBackgroundStyle(darkMode);
  }
}

export function changeMapBackground(
  map: Map,
  background: BackgroundType,
  darkMode: boolean,
  onStyleLoad: () => void
) {
  if (!map) return;

  const style = getBackgroundStyle(background, darkMode);

  const waitForStyle = () => {
    if (map.isStyleLoaded()) {
      setTimeout(onStyleLoad, 0);
    } else {
      map.once('idle', () => setTimeout(onStyleLoad, 0));
    }
  };
  map.once('styledata', waitForStyle);

  map.setStyle(typeof style === 'string' ? style : (style as any));
}

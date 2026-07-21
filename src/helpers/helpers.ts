import polylabel from '@mapbox/polylabel';
import type { Feature, Position } from 'geojson';
import turfArea from '@turf/area';
import type { BBox } from '@turf/helpers';
import type maplibregl from 'maplibre-gl';
import type { LngLat } from 'maplibre-gl';
import { cityConfig } from '../configs/config';
import type { OfficeLocation } from '../configs/types';

export function getDefaultZoom(): Partial<maplibregl.MapOptions> {
  return {
    zoom: cityConfig.map.defaultZoom,
    center: cityConfig.map.defaultCenter
  };
}

export const defaultZoom: Partial<maplibregl.MapOptions> = getDefaultZoom();

export function findPolylabel(feature: Feature) {
  let output: number[] = [];

  try {
    if (feature.geometry.type === 'Polygon') {
      if (
        feature.geometry.coordinates &&
        feature.geometry.coordinates.length > 0
      ) {
        output = polylabel(feature.geometry.coordinates);
      }
    }

    if (feature.geometry.type === 'MultiPolygon') {
      if (
        feature.geometry.coordinates &&
        feature.geometry.coordinates.length > 0
      ) {
        let maxArea = 0,
          maxPolygon: Position[][] = [];
        for (let i = 0, l = feature.geometry.coordinates.length; i < l; i++) {
          const p = feature.geometry.coordinates[i];
          if (p && p.length > 0) {
            const area = turfArea({ type: 'Polygon', coordinates: p });
            if (area > maxArea) {
              maxPolygon = p;
              maxArea = area;
            }
          }
        }
        if (maxPolygon.length > 0) {
          output = polylabel(maxPolygon);
        }
      }
    }
  } catch (error) {
    console.warn(
      'Error calculating polylabel for feature:',
      feature.properties?.['namecol'],
      error
    );
  }

  return output;
}

export function getWardName(namecol: string): string {
  // "151-419: Name" (AC-Part polling station code) → "Name"
  const psCodeMatch = namecol.match(/^(\d+-\d+):\s*(.+)$/);
  if (psCodeMatch) return psCodeMatch[2];

  // "123: Name" → "Name"
  const colonMatch = namecol.match(/^(\d+):\s*(.+)$/);
  if (colonMatch) return colonMatch[2];

  // "123-Name" → "Name"
  const dashMatch = namecol.match(/^(\d+)-(.+)$/);
  if (dashMatch) return dashMatch[2];

  // "C1 Name" / "E2 Name" / "S13 Name" → "Name"
  const prefixMatch = namecol.match(/^([A-Z]+\d+)\s+(.+)$/);
  if (prefixMatch) return prefixMatch[2];

  return namecol;
}

export function getBoundaryNumber(namecol: string): string {
  // "151-419: Name" (AC-Part polling station code) → "151-419"
  const psCodeMatch = namecol.match(/^(\d+-\d+):\s*.+$/);
  if (psCodeMatch) return psCodeMatch[1];

  const colonMatch = namecol.match(/^(\d+)\s*[A-Za-z]?\s*:\s*.+$/);
  if (colonMatch) return colonMatch[1];

  const dashMatch = namecol.match(/^(\d+)\s*[A-Za-z]?\s*-.+$/);
  if (dashMatch) return dashMatch[1];

  const prefixMatch = namecol.match(/^([A-Z]+\d+)\s+.+$/);
  if (prefixMatch) return prefixMatch[1];

  // "Ward 1", "Sector 67", "Ward 21A", "Ward 139 A" → trailing number
  const trailingMatch = namecol.match(/\s(\d+)(?:[\/\-]\d+)?\s*[A-Za-z]?$/);
  if (trailingMatch) return trailingMatch[1];

  return '';
}

export function sortedDistricts(
  features: Feature[],
  sortBy?: 'boundaryNumber' | 'wardName'
): Feature[] {
  if (sortBy === 'boundaryNumber') {
    return features.sort((a, b) => {
      // Numeric-aware compare handles both plain ("1" < "2" < "10") and
      // composite AC-Part codes ("150-1" < "151-42" < "151-419").
      const aNum = a.properties?.['boundaryNumber'] || '';
      const bNum = b.properties?.['boundaryNumber'] || '';
      const numCmp = aNum.localeCompare(bNum, undefined, { numeric: true });
      if (numCmp !== 0) return numCmp;
      const aName =
        a.properties?.['wardName'] || a.properties?.['namecol'] || '';
      const bName =
        b.properties?.['wardName'] || b.properties?.['namecol'] || '';
      return aName.localeCompare(bName, undefined, { numeric: true });
    });
  }
  return features.sort((a, b) => {
    const aName = a.properties?.['wardName'] || a.properties?.['namecol'] || '';
    const bName = b.properties?.['wardName'] || b.properties?.['namecol'] || '';
    return aName.localeCompare(bName, undefined, { numeric: true });
  });
}

export function zoomToBound(map: maplibregl.Map, bounds: BBox) {
  const [x1, y1, x2, y2] = bounds;

  map.fitBounds([x1, y1, x2, y2], {
    padding: { top: 72, bottom: 24, left: 16, right: 16 },
    maxZoom: 15
  });
}

export function resetZoom(map: maplibregl.Map) {
  const currentZoom = map.getZoom();
  const targetZoom = defaultZoom.zoom!;

  if (currentZoom > targetZoom) return;

  map.flyTo({
    center: defaultZoom.center,
    zoom: targetZoom
  });
}

function mergeOfficials(officials: any[]): any[] {
  const groups = new Map<string, any>();
  for (const official of officials) {
    const key = `${(official.Designation || '').toLowerCase()}::${(official.Name || '').toLowerCase()}`;
    const existing = groups.get(key);
    if (existing) {
      const existingPhones = new Set(
        (existing.Phone || '')
          .split(',')
          .map((p: string) => p.trim())
          .filter(Boolean)
      );
      const newPhones = (official.Phone || '')
        .split(',')
        .map((p: string) => p.trim())
        .filter(Boolean);
      for (const phone of newPhones) {
        existingPhones.add(phone);
      }
      existing.Phone = [...existingPhones].join(',');
      if (!existing['E-Mail'] && official['E-Mail']) {
        existing['E-Mail'] = official['E-Mail'];
      }
      if (!existing.Twitter && official.Twitter) {
        existing.Twitter = official.Twitter;
      }
    } else {
      groups.set(key, { ...official });
    }
  }
  return [...groups.values()];
}

const officialDetailsCache = new Map<string, any[] | null>();
let officialDetailsCacheRef: any[] | null = null;

export function getOfficialDetails(
  boundaryId: string | null,
  districtId: string | null,
  officials: any[]
) {
  if (!boundaryId || !districtId) return null;

  // Invalidate cache if officials array reference changed
  if (officials !== officialDetailsCacheRef) {
    officialDetailsCache.clear();
    officialDetailsCacheRef = officials;
  }

  const cacheKey = `${boundaryId.toLowerCase()}:${districtId.toLowerCase()}`;
  if (officialDetailsCache.has(cacheKey)) {
    return officialDetailsCache.get(cacheKey)!;
  }

  const dept = cityConfig.departments[boundaryId];

  // Some departments key officials by the boundary number rather than the full
  // area name (e.g. polling booths matched only on their "AC-Part" PSCode).
  const areaKey = dept?.matchByBoundaryNumber
    ? getBoundaryNumber(districtId)
    : districtId;

  const matchingOfficials = areaKey
    ? officials.filter(official => {
        return (
          official.Department.toLowerCase() === boundaryId.toLowerCase() &&
          official.Area.toLowerCase() === areaKey.toLowerCase()
        );
      })
    : [];

  if (dept?.commonOfficials) {
    const mapped = dept.commonOfficials.map(o => ({
      Department: boundaryId,
      Area: districtId,
      Designation: o.designation,
      DesignationRegional: o.designationRegional,
      Name: o.name,
      NameRegional: o.nameRegional,
      Phone: o.phone,
      'E-Mail': o.email,
      Source: '',
      Notes: '',
      AreaRegional: ''
    }));
    matchingOfficials.push(...mapped);
  }

  const merged = mergeOfficials(matchingOfficials);
  const result = merged.length > 0 ? merged : null;
  officialDetailsCache.set(cacheKey, result);
  return result;
}

export function getLngLat(params: URLSearchParams): LngLat | null {
  const lng = params.get('lng');
  const lat = params.get('lat');
  return lng && lat ? ({ lng: +lng, lat: +lat } as LngLat) : null;
}

export { isRegionalLocale, getRegionalLanguageCode } from './locale';

const officeLabelKeys: Record<string, string> = {
  police_city: 'police_station',
  police_traffic: 'traffic_police_station'
};

const corporateOfficeNames = ['bescom corporate office', 'cauvery bhavan'];

export function getOfficeLocation(
  boundaryId: string | null,
  districtId: string | null,
  officials: any[]
): OfficeLocation | null {
  if (!boundaryId || !districtId) return null;

  const match = officials.find(
    (o: any) =>
      o.Department.toLowerCase() === boundaryId.toLowerCase() &&
      o.Area.toLowerCase() === districtId.toLowerCase() &&
      o.OfficeLat != null &&
      o.OfficeLng != null
  ) as any;

  if (!match) return null;

  const officeName = (match.OfficeName || '').toLowerCase();
  if (corporateOfficeNames.some(name => officeName.startsWith(name)))
    return null;

  return {
    name: match.OfficeName || districtId,
    lat: match.OfficeLat,
    lng: match.OfficeLng,
    labelKey: officeLabelKeys[boundaryId.toLowerCase()]
  };
}

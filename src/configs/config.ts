import type { CityConfig, LocaleStrings } from './types';

import blrConfigData from './blr.json';
import mumbaiConfigData from './mumbai.json';
import puneConfigData from './pune.json';
import chennaiConfigData from './chennai.json';
import kolkataConfigData from './kolkata.json';
import hydConfigData from './hyd.json';
import delhiConfigData from './delhi.json';
import vizagConfigData from './vizag.json';

import sharedEn from '../assets/locales/shared/en.json';
import sharedKn from '../assets/locales/shared/kn.json';
import sharedHi from '../assets/locales/shared/hi.json';
import sharedMr from '../assets/locales/shared/mr.json';
import sharedTa from '../assets/locales/shared/ta.json';
import sharedBn from '../assets/locales/shared/bn.json';
import sharedTe from '../assets/locales/shared/te.json';

import blrEn from '../assets/locales/blr/en.json';
import blrKn from '../assets/locales/blr/kn.json';

import mumbaiEn from '../assets/locales/mumbai/en.json';
import mumbaiMr from '../assets/locales/mumbai/mr.json';

import puneEn from '../assets/locales/pune/en.json';
import puneMr from '../assets/locales/pune/mr.json';

import chennaiEn from '../assets/locales/chennai/en.json';
import chennaiTa from '../assets/locales/chennai/ta.json';

import kolkataEn from '../assets/locales/kolkata/en.json';
import kolkataBn from '../assets/locales/kolkata/bn.json';

import hydEn from '../assets/locales/hyd/en.json';
import hydTe from '../assets/locales/hyd/te.json';

import delhiEn from '../assets/locales/delhi/en.json';
import delhiHi from '../assets/locales/delhi/hi.json';

import vizagEn from '../assets/locales/vizag/en.json';
import vizagTe from '../assets/locales/vizag/te.json';

const CITY = import.meta.env['VITE_CITY'];

export const isAllCitiesMode = CITY === 'all';

export const allCityConfigs: Record<string, CityConfig> = {
  blr: blrConfigData as unknown as CityConfig,
  mumbai: mumbaiConfigData as unknown as CityConfig,
  pune: puneConfigData as unknown as CityConfig,
  chennai: chennaiConfigData as unknown as CityConfig,
  kolkata: kolkataConfigData as unknown as CityConfig,
  hyd: hydConfigData as unknown as CityConfig,
  delhi: delhiConfigData as unknown as CityConfig,
  vizag: vizagConfigData as unknown as CityConfig
};

export const allCityIds = Object.keys(allCityConfigs);

const allCityLocaleData: Record<
  string,
  Record<string, Partial<LocaleStrings>>
> = {
  blr: { en: blrEn, kn: blrKn },
  mumbai: { en: mumbaiEn, mr: mumbaiMr },
  pune: { en: puneEn, mr: puneMr },
  chennai: { en: chennaiEn, ta: chennaiTa },
  kolkata: { en: kolkataEn, bn: kolkataBn },
  hyd: { en: hydEn, te: hydTe },
  delhi: { en: delhiEn, hi: delhiHi },
  vizag: { en: vizagEn, te: vizagTe }
};

const sharedLocales: Record<string, Partial<LocaleStrings>> = {
  en: sharedEn,
  kn: sharedKn,
  hi: sharedHi,
  mr: sharedMr,
  ta: sharedTa,
  bn: sharedBn,
  te: sharedTe
};

function getInitialConfig(): CityConfig {
  if (isAllCitiesMode) return allCityConfigs['blr'];
  // If/else allows the bundler to dead-code eliminate the unused city's config and locales
  if (CITY === 'mumbai') return mumbaiConfigData as unknown as CityConfig;
  if (CITY === 'pune') return puneConfigData as unknown as CityConfig;
  if (CITY === 'chennai') return chennaiConfigData as unknown as CityConfig;
  if (CITY === 'kolkata') return kolkataConfigData as unknown as CityConfig;
  if (CITY === 'hyd') return hydConfigData as unknown as CityConfig;
  if (CITY === 'delhi') return delhiConfigData as unknown as CityConfig;
  if (CITY === 'vizag') return vizagConfigData as unknown as CityConfig;
  return blrConfigData as unknown as CityConfig;
}

function getCityLocales(
  config: CityConfig
): Record<string, Partial<LocaleStrings>> {
  if (isAllCitiesMode) return allCityLocaleData[config.cityId] || {};
  // Dead-code elimination for single-city builds
  if (CITY === 'mumbai') return { en: mumbaiEn, mr: mumbaiMr };
  if (CITY === 'pune') return { en: puneEn, mr: puneMr };
  if (CITY === 'chennai') return { en: chennaiEn, ta: chennaiTa };
  if (CITY === 'kolkata') return { en: kolkataEn, bn: kolkataBn };
  if (CITY === 'hyd') return { en: hydEn, te: hydTe };
  if (CITY === 'delhi') return { en: delhiEn, hi: delhiHi };
  if (CITY === 'vizag') return { en: vizagEn, te: vizagTe };
  return { en: blrEn, kn: blrKn };
}

function buildLocales(config: CityConfig): Record<string, LocaleStrings> {
  const citySpecific = getCityLocales(config);
  return config.supportedLanguages.reduce(
    (acc, lang) => {
      const shared = sharedLocales[lang.code] || {};
      const city = citySpecific[lang.code] || {};
      acc[lang.code] = { ...shared, ...city } as LocaleStrings;
      return acc;
    },
    {} as Record<string, LocaleStrings>
  );
}

// Mutable exports — updated via setCity() for all-cities mode.
// ES module live bindings ensure importers always see the current value.
export let cityConfig: CityConfig = getInitialConfig();
export let locales: Record<string, LocaleStrings> = buildLocales(cityConfig);

// Callbacks registered by other modules that need to react to city changes
const onCityChangeCallbacks: Array<() => void> = [];
export function onCityChange(cb: () => void) {
  onCityChangeCallbacks.push(cb);
}

export function setCity(cityId: string) {
  const config = allCityConfigs[cityId];
  if (!config) throw new Error(`Unknown city: ${cityId}`);
  cityConfig = config;
  locales = buildLocales(config);
  onCityChangeCallbacks.forEach(cb => cb());
}

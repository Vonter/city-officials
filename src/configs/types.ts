export interface CityConfig {
  cityId: string;
  pageTitleKey: string;
  logo: string;
  supportedLanguages: Array<{
    code: string;
    nameKey: string;
  }>;
  map: {
    defaultZoom: number;
    defaultCenter: [number, number];
    maxBounds?: [[number, number], [number, number]];
    maxZoom?: number;
  };
  seo: {
    title: string;
    description: string;
    keywords: string;
    author: string;
    baseUrl: string;
    image: string;
  };
  overlapRenderDepartment?: string;
  departments: {
    [key: string]: DepartmentConfig;
  };
}

export interface LocaleStrings {
  search_placeholder: string;
  footer_data: string;
  footer_code: string;
  footer_betanyc: string;
  introduction: string;
  filter_placeholder: string;
  details_title: string;
  details_source: string;
  details_error: string;
  details_add_comment: string;
  information_source_url: string;
  information_last_updated: string;
  fetching_location_details: string;
  no_officials: string;
  [key: string]: string; // Allow additional string properties for svelte-i18n compatibility
}

export interface DepartmentConfig {
  nameKey: string;
  icon: string;
  websiteUrl: string;
  geodataUrl: string;
  contacts: Contact[];
  parentDepartment?: string;
  childDepartments?: string[];
  commonOfficials?: CommonOfficial[];
  group?: string;
  descriptionKey?: string;
  color?: string;
  darkColor?: string;
  showBoundaryNumber?: boolean;
  sortBy?: 'boundaryNumber' | 'wardName';
  showWebsite?: boolean;
  sources?: string[];
  sidebarLast?: boolean;
  matchByBoundaryNumber?: boolean;
}

export interface OfficeLocation {
  name: string;
  lat: number;
  lng: number;
  labelKey?: string;
}

export interface Contact {
  type:
    | 'phone'
    | 'email'
    | 'whatsapp'
    | 'twitter'
    | 'facebook'
    | 'instagram'
    | 'website';
  labelKey: string;
  value: string;
  name?: string;
  regionalName?: string;
}

export interface CommonOfficial {
  designation: string;
  designationRegional: string;
  name: string;
  nameRegional: string;
  phone: string;
  email: string;
}

export interface ILayer {
  nameKey: string;
  description: string;
  descriptionKey: string;
  description_url: string;
  icon: string;
  color: string;
  darkColor: string;
  formatUrl: (name: string) => string;
  geodata_url: string;
  defaultOfficials: any[];
  defaultContacts: Contact[];
  parentDepartment?: string;
  childDepartments?: string[];
  commonOfficials?: CommonOfficial[];
  showBoundaryNumber?: boolean;
  sortBy?: 'boundaryNumber' | 'wardName';
  showWebsite?: boolean;
  sidebarLast?: boolean;
}

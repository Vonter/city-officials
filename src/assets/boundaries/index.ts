import { cityConfig, onCityChange } from '../../configs/config';
import type { DepartmentConfig } from '../../configs/types';
import type { ILayer } from '../../configs/types';

type ILayers = {
  [key in string]: ILayer;
};

// Helper function to create default contacts from department config
function createDefaultContacts(dept: DepartmentConfig): Array<{
  type: 'phone' | 'email' | 'whatsapp' | 'twitter' | 'facebook' | 'instagram';
  labelKey: string;
  value: string;
}> {
  return dept.contacts.map(contact => ({
    type: contact.type,
    labelKey: contact.labelKey,
    value: contact.value
  }));
}

// Helper function to generate layers from city configuration
function generateLayers(): ILayers {
  const generatedLayers: ILayers = {};

  Object.entries(cityConfig.departments).forEach(([key, dept]) => {
    generatedLayers[key] = {
      nameKey: dept.nameKey,
      description: '',
      descriptionKey: dept.descriptionKey || '',
      description_url: '',
      icon: dept.icon,
      color: dept.color || '#2463eb',
      darkColor: dept.darkColor || '#b3bac5',
      formatUrl: () => dept.websiteUrl,
      geodata_url: dept.geodataUrl,
      defaultOfficials: [],
      defaultContacts: createDefaultContacts(dept),
      parentDepartment: dept.parentDepartment,
      childDepartments: dept.childDepartments,
      commonOfficials: dept.commonOfficials,
      showBoundaryNumber: dept.showBoundaryNumber,
      sortBy: dept.sortBy,
      showWebsite: dept.showWebsite,
      sidebarLast: dept.sidebarLast
    };
  });

  return generatedLayers;
}

export let layers: ILayers = generateLayers();

onCityChange(() => {
  layers = generateLayers();
});

import { mount, unmount } from 'svelte';
import MapControlGroup from '../components/MapControlGroup.svelte';
import type { BackgroundType } from './mapBackground';

export function createMapControlGroup(
  onBackgroundChange: (background: BackgroundType) => void,
  orientation: 'vertical' | 'horizontal'
) {
  const container = document.createElement('div');
  container.className = 'maplibregl-ctrl';

  const component = mount(MapControlGroup as any, {
    target: container,
    props: { onBackgroundChange, orientation }
  });

  return {
    onAdd: () => container,
    onRemove: () => {
      unmount(component);
      container.parentNode?.removeChild(container);
    }
  };
}

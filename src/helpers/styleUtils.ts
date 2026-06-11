// The !important hover variants are required to beat maplibre-gl's stock
// `.maplibregl-ctrl button:not(:disabled):hover` background-color rule,
// which is more specific than plain Tailwind hover utilities.
export const mapControlButtonClass =
  'w-10 h-10 flex items-center justify-center bg-white text-gray-600 shadow-md rounded hover:!bg-blue-50 hover:text-blue-500 focus:outline-none focus:ring focus:ring-blue-500';

export function alternatingRowClass(index: number, isDark = false): string {
  return index % 2 === 0
    ? 'bg-white dark:bg-neutral-900'
    : 'bg-gray-100 dark:bg-neutral-800';
}

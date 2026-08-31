// Categoría tal como la consumen los <select> del front: nombre + grupo padre.
export interface CategoryOption {
  name: string;
  grupo: string | null;
}

// Orden fijo de los grupos en los dropdowns (los <optgroup>).
export const GROUP_ORDER = [
  "Necesidades",
  "Discrecional",
  "Flujos internos",
  "Ingresos",
  "Fallback",
];

// Agrupa las categorías por `grupo` respetando GROUP_ORDER. Cualquier grupo
// desconocido (o null) cae en "Otras", que se muestra al final. Dentro de cada
// grupo se conserva el orden en que vienen (la API ya las manda por `orden`).
export function groupCategories(
  categories: CategoryOption[]
): { grupo: string; items: CategoryOption[] }[] {
  const buckets = new Map<string, CategoryOption[]>();
  for (const c of categories) {
    const g = c.grupo && GROUP_ORDER.includes(c.grupo) ? c.grupo : "Otras";
    const list = buckets.get(g) ?? [];
    list.push(c);
    buckets.set(g, list);
  }
  const ordered: { grupo: string; items: CategoryOption[] }[] = [];
  for (const g of GROUP_ORDER) {
    const items = buckets.get(g);
    if (items?.length) ordered.push({ grupo: g, items });
  }
  const otras = buckets.get("Otras");
  if (otras?.length) ordered.push({ grupo: "Otras", items: otras });
  return ordered;
}

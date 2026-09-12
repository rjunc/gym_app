// Merges `incoming` items into `prev` by `id` — matching ids get overwritten
// in place, new ones get appended, anything else already in `prev` is left
// alone. Used when importing files so re-importing the same data never
// creates duplicates.
export function mergeById(prev, incoming) {
  const byId = new Map(prev.map((item) => [item.id, item]));
  incoming.forEach((item) => byId.set(item.id, item));
  return Array.from(byId.values());
}

import { uid } from "./id.js";

export function folderPath(folders, folderId) {
  const byId = new Map(folders.map((f) => [f.id, f]));
  const parts = [];
  let cur = folderId ? byId.get(folderId) : null;
  while (cur) {
    parts.unshift(cur);
    cur = cur.parentId ? byId.get(cur.parentId) : null;
  }
  return parts;
}

// pure: resolve/create a "A/B/C" folder path against a folders array, returns { id, folders }
export function resolveFolderPath(folders, pathStr) {
  if (!pathStr || !pathStr.trim()) return { id: null, folders };
  const names = pathStr.split("/").map((n) => n.trim()).filter(Boolean);
  let parentId = null;
  let list = folders;
  names.forEach((name) => {
    const existing = list.find((f) => f.name === name && (f.parentId || null) === parentId);
    if (existing) {
      parentId = existing.id;
    } else {
      const created = { id: uid(), name, parentId };
      list = [...list, created];
      parentId = created.id;
    }
  });
  return { id: parentId, folders: list };
}

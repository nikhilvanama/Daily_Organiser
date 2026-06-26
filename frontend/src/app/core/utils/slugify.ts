export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')   // strip diacritics
    .replace(/[^a-z0-9\s-]/g, '')      // strip special chars
    .trim()
    .replace(/\s+/g, '-')              // spaces → hyphens
    .replace(/-+/g, '-');              // collapse consecutive hyphens
}

export function assetUrl(src) {
  if (!src || !src.startsWith("/")) return src;
  const base = import.meta.env.BASE_URL;
  return base === "/" || src.startsWith(base) ? src : base + src.slice(1);
}

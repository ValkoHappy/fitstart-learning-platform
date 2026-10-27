import { assetUrl } from "../lib/assetUrl";
import { useEffect, useState } from "react";
function withWebpSource(src) {
  if (
    !src ||
    src.endsWith(".webp") ||
    src.toLowerCase().endsWith(".png") ||
    src.startsWith("data:") ||
    src.startsWith("blob:")
  ) {
    return "";
  }
  return `${src}.webp`;
}
function OptimizedImage({ src, alt, children, onError, ...props }) {
  const [useWebp, setUseWebp] = useState(true);
  src = assetUrl(src);
  const webpSrc = withWebpSource(src);
  useEffect(() => {
    setUseWebp(true);
  }, [src]);
  if (!src) {
    return children || null;
  }
  const handleError = (event) => {
    if (useWebp && webpSrc) {
      setUseWebp(false);
      return;
    }
    onError?.(event);
  };
  return (
    <picture>
      {useWebp && webpSrc && <source srcSet={webpSrc} type="image/webp" />}
      <img src={src} alt={alt} {...props} onError={handleError} />
    </picture>
  );
}
export default OptimizedImage;

import { useEffect, useState } from "react";
import styles from "./ScrollTopButton.module.scss";
function ScrollTopButton({ targetSelector, className = "" }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const target = targetSelector
      ? document.querySelector(targetSelector)
      : window;
    if (!target) {
      setVisible(false);
      return undefined;
    }
    const getScrollTop = () =>
      target === window ? window.scrollY : target.scrollTop;
    const updateVisibility = () => setVisible(getScrollTop() > 420);
    updateVisibility();
    target.addEventListener("scroll", updateVisibility, { passive: true });
    window.addEventListener("resize", updateVisibility);
    return () => {
      target.removeEventListener("scroll", updateVisibility);
      window.removeEventListener("resize", updateVisibility);
    };
  }, [targetSelector]);
  const scrollToTop = () => {
    const target = targetSelector
      ? document.querySelector(targetSelector)
      : window;
    if (!target) return;
    target.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };
  return (
    <button
      type="button"
      className={`${styles.button} ${visible ? styles.visible : ""} ${className}`}
      onClick={scrollToTop}
      aria-label="Наверх"
      title="Наверх"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 19V5" />
        <path d="M5 12l7-7 7 7" />
      </svg>
    </button>
  );
}
export default ScrollTopButton;

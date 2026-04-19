import { useEffect, useState } from 'react';

const MOBILE_BREAKPOINT = 768;

export function useResponsive() {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    setWidth(window.innerWidth);
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const isMobile = width > 0 && width < MOBILE_BREAKPOINT;
  const isDesktop = width >= MOBILE_BREAKPOINT;

  return { isMobile, isDesktop, width };
}

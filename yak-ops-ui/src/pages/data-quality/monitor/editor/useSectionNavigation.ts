import { useCallback, useEffect, useRef, useState } from 'react';
import { SECTION_ITEMS, type SectionKey } from './EditorLayout';

const LAST_SECTION_KEY = SECTION_ITEMS[SECTION_ITEMS.length - 1].key;

export const useSectionNavigation = () => {
  const pageRootRef = useRef<HTMLDivElement>(null);
  const [activeSection, setActiveSection] =
    useState<SectionKey>('basic-config');

  const locateSection = useCallback((key: SectionKey) => {
    const container = pageRootRef.current;
    const target = document.getElementById(key);
    if (!container || !target) return;
    const top =
      container.scrollTop +
      target.getBoundingClientRect().top -
      container.getBoundingClientRect().top -
      24;
    container.scrollTo({
      top: key === LAST_SECTION_KEY ? container.scrollHeight : Math.max(0, top),
      behavior: 'smooth',
    });
    setActiveSection(key);
  }, []);

  useEffect(() => {
    const container = pageRootRef.current;
    if (!container) return undefined;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (
          container.scrollHeight -
            container.clientHeight -
            container.scrollTop <
          16
        ) {
          setActiveSection(LAST_SECTION_KEY);
          return;
        }
        const threshold = container.getBoundingClientRect().top + 140;
        let current: SectionKey = SECTION_ITEMS[0].key;
        SECTION_ITEMS.forEach((item) => {
          const element = document.getElementById(item.key);
          if (element && element.getBoundingClientRect().top <= threshold) {
            current = item.key;
          }
        });
        setActiveSection(current);
      });
    };
    container.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      container.removeEventListener('scroll', onScroll);
    };
  }, []);

  return { pageRootRef, activeSection, locateSection };
};

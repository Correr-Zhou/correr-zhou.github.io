'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Disclosure } from '@headlessui/react';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import LanguageToggle from '@/components/ui/LanguageToggle';
import type { SiteConfig } from '@/lib/config';
import { useLocaleStore } from '@/lib/stores/localeStore';
import { useMessages } from '@/lib/i18n/useMessages';
import type { I18nRuntimeConfig } from '@/types/i18n';

interface NavigationProps {
  items: SiteConfig['navigation'];
  siteTitle: string;
  enableOnePageMode?: boolean;
  i18n: I18nRuntimeConfig;
  itemsByLocale?: Record<string, SiteConfig['navigation']>;
  siteTitleByLocale?: Record<string, string>;
}

export default function Navigation({
  items,
  siteTitle,
  enableOnePageMode,
  i18n,
  itemsByLocale,
  siteTitleByLocale,
}: NavigationProps) {
  const pathname = usePathname();
  const locale = useLocaleStore((state) => state.locale);
  const [scrolled, setScrolled] = useState(false);
  const [hoveredHref, setHoveredHref] = useState<string | null>(null);
  const [activeHash, setActiveHash] = useState('');
  const messages = useMessages();
  const navContainerRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState<{
    left: number;
    width: number;
    top: number;
    height: number;
  } | null>(null);

  const effectiveItems = useMemo(() => {
    if (!i18n.enabled) return items;
    return itemsByLocale?.[locale] || itemsByLocale?.[i18n.defaultLocale] || items;
  }, [i18n.defaultLocale, i18n.enabled, items, itemsByLocale, locale]);

  const effectiveSiteTitle = useMemo(() => {
    if (!i18n.enabled) return siteTitle;
    return siteTitleByLocale?.[locale] || siteTitleByLocale?.[i18n.defaultLocale] || siteTitle;
  }, [i18n.defaultLocale, i18n.enabled, locale, siteTitle, siteTitleByLocale]);

  // The active-item highlight is shown while scrolling (or hovering) and fades out after 1s idle.
  const [scrollActive, setScrollActive] = useState(true);
  useEffect(() => {
    let idleTimer: ReturnType<typeof setTimeout> | undefined;
    const armIdle = () => {
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => setScrollActive(false), 1000);
    };
    const handleScroll = () => {
      const isScrolled = window.scrollY > 20;
      setScrolled(isScrolled);
      setScrollActive(true);
      armIdle();
    };

    setScrolled(window.scrollY > 20);
    armIdle();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (idleTimer) clearTimeout(idleTimer);
    };
  }, []);

  // Scroll-spy: the active item is the last section (in nav order = document order) whose top has
  // passed a line just below the fixed nav. At the very top -> first item; at the very bottom ->
  // last item. Right after a nav click the clicked item is kept for a moment.
  const clickLockUntil = useRef(0);
  const lockToClicked = (hash: string) => {
    clickLockUntil.current = Date.now() + 1000;
    setActiveHash(hash);
  };

  useEffect(() => {
    if (!enableOnePageMode) return;
    const tracked = effectiveItems.filter((item) => item.type === 'page' || item.type === 'section');
    if (!tracked.length) return;
    const toHash = (target: string) => (target === 'about' ? '' : `#${target}`);
    let frame = 0;

    const update = () => {
      frame = 0;
      if (Date.now() < clickLockUntil.current) return;
      const doc = document.documentElement;
      let current = tracked[0];
      if (window.scrollY <= 4) {
        current = tracked[0];
      } else if (window.innerHeight + window.scrollY >= doc.scrollHeight - 4) {
        current = tracked[tracked.length - 1];
      } else {
        const line = 140; // just below the fixed nav; anchored sections land at ~96px
        for (const item of tracked) {
          const el = document.getElementById(item.target);
          if (el && el.getBoundingClientRect().top <= line) current = item;
        }
      }
      setActiveHash(toHash(current.target));
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    const onHash = () => setActiveHash(window.location.hash);

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    window.addEventListener('hashchange', onHash);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      window.removeEventListener('hashchange', onHash);
    };
  }, [enableOnePageMode, effectiveItems]);

  const isDesktopItemActive = (item: SiteConfig['navigation'][number]) =>
    enableOnePageMode
      ? activeHash === `#${item.target}` || (!activeHash && item.target === 'about')
      : (item.href === '/'
        ? pathname === '/'
        : pathname.startsWith(item.href));

  const getDesktopItemHref = (item: SiteConfig['navigation'][number]) =>
    enableOnePageMode ? `/#${item.target}` : item.href;

  const activeItem = effectiveItems.find((item) => isDesktopItemActive(item)) ?? null;
  const activeHref = activeItem ? getDesktopItemHref(activeItem) : null;
  const indicatorHref = hoveredHref ?? activeHref;

  const measureIndicator = useCallback(() => {
    const container = navContainerRef.current;
    if (!container || !indicatorHref) {
      setIndicatorStyle(null);
      return;
    }
    const el = container.querySelector<HTMLElement>(
      `[data-nav-href="${CSS.escape(indicatorHref)}"]`
    );
    if (!el) {
      setIndicatorStyle(null);
      return;
    }
    setIndicatorStyle({
      left: el.offsetLeft,
      width: el.offsetWidth,
      top: el.offsetTop,
      height: el.offsetHeight,
    });
  }, [indicatorHref]);

  useEffect(() => {
    measureIndicator();
  }, [measureIndicator]);

  useEffect(() => {
    window.addEventListener('resize', measureIndicator);
    return () => window.removeEventListener('resize', measureIndicator);
  }, [measureIndicator]);

  return (
    <Disclosure as="nav" className="fixed top-0 left-0 right-0 z-50">
      {({ open }) => (
        <>
          <motion.div
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.6 }}
            className={cn(
              'transition-all duration-300 ease-out',
              scrolled
                ? 'bg-background/80 backdrop-blur-xl border-b border-neutral-200/50 shadow-lg'
                : 'bg-background/95 border-b border-transparent'
            )}
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16 lg:h-20">
                <div className="flex-shrink-0">
                  <span className="text-base sm:text-lg lg:text-xl font-serif font-semibold text-primary whitespace-nowrap select-none">
                    {effectiveSiteTitle}
                  </span>
                </div>

                <div className="hidden lg:block">
                  <div className="ml-10 flex items-center space-x-3">
                    <div
                      ref={navContainerRef}
                      className="relative flex items-baseline space-x-1"
                      onMouseLeave={() => setHoveredHref(null)}
                    >
                      {indicatorStyle && (
                        <motion.div
                          className={cn(
                            'absolute rounded-lg pointer-events-none',
                            hoveredHref && hoveredHref !== activeHref ? 'bg-accent/[0.07]' : 'bg-accent/10'
                          )}
                          initial={false}
                          animate={{
                            left: indicatorStyle.left,
                            width: indicatorStyle.width,
                            top: indicatorStyle.top,
                            height: indicatorStyle.height,
                            opacity: scrollActive || hoveredHref ? 1 : 0,
                          }}
                          transition={{
                            default: { type: 'spring', stiffness: 400, damping: 28 },
                            opacity: { duration: 0.35, ease: 'easeOut' },
                          }}
                        />
                      )}
                      {effectiveItems.map((item) => {
                        const isActive = isDesktopItemActive(item);
                        const href = getDesktopItemHref(item);

                        return (
                          <Link
                            key={item.target}
                            href={href}
                            data-nav-href={href}
                            prefetch={true}
                            onClick={() => enableOnePageMode && lockToClicked(item.target === 'about' ? '' : `#${item.target}`)}
                            onMouseEnter={() => setHoveredHref(href)}
                            className={cn(
                              'relative px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-150',
                              isActive
                                ? 'text-primary'
                                : hoveredHref === href
                                  ? 'text-primary'
                                  : 'text-neutral-600'
                            )}
                          >
                            {item.title}
                          </Link>
                        );
                      })}
                    </div>
                    <LanguageToggle i18n={i18n} />
                    <ThemeToggle />
                  </div>
                </div>

                <div className="lg:hidden flex items-center space-x-2">
                  <LanguageToggle i18n={i18n} />
                  <ThemeToggle />
                  <Disclosure.Button className="inline-flex items-center justify-center p-2 rounded-md text-neutral-600 hover:text-primary hover:bg-neutral-100 dark:hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-accent transition-colors duration-200">
                    <span className="sr-only">{messages.navigation.openMainMenu}</span>
                    <motion.div
                      animate={{ rotate: open ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      {open ? (
                        <XMarkIcon className="block h-6 w-6" aria-hidden="true" />
                      ) : (
                        <Bars3Icon className="block h-6 w-6" aria-hidden="true" />
                      )}
                    </motion.div>
                  </Disclosure.Button>
                </div>
              </div>
            </div>
          </motion.div>

          <AnimatePresence>
            {open && (
              <Disclosure.Panel static>
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="lg:hidden bg-background/95 backdrop-blur-xl border-b border-neutral-200/50 shadow-lg"
                >
                  <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                    {effectiveItems.map((item, index) => {
                      const isActive = enableOnePageMode
                        ? (item.href === '/' ? pathname === '/' && !activeHash : activeHash === `#${item.target}`)
                        : (item.href === '/'
                          ? pathname === '/'
                          : pathname.startsWith(item.href));

                      const href = enableOnePageMode
                        ? (item.href === '/' ? '/' : `/#${item.target}`)
                        : item.href;

                      return (
                        <motion.div
                          key={item.target}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                        >
                          <Disclosure.Button
                            as={Link}
                            href={href}
                            prefetch={true}
                            onClick={() => enableOnePageMode && lockToClicked(item.href === '/' ? '' : `#${item.target}`)}
                            className={cn(
                              'block px-3 py-2 rounded-md text-base font-medium transition-all duration-200',
                              isActive
                                ? 'text-primary bg-accent/10'
                                : 'text-neutral-600 hover:text-primary hover:bg-neutral-50'
                            )}
                          >
                            {item.title}
                          </Disclosure.Button>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              </Disclosure.Panel>
            )}
          </AnimatePresence>
        </>
      )}
    </Disclosure>
  );
}

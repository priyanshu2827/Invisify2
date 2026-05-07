'use client';

import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { StegoShieldLogo } from '@/components/app/icons';
import { gsap } from 'gsap';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import './StaggeredMenu.css';

export interface MenuItem {
  label: string;
  ariaLabel?: string;
  link: string;
}

export interface SocialItem {
  label: string;
  link: string;
}

export interface StaggeredMenuProps {
  position?: 'left' | 'right';
  colors?: string[];
  items?: MenuItem[];
  socialItems?: SocialItem[];
  displaySocials?: boolean;
  displayItemNumbering?: boolean;
  menuButtonColor?: string;
  openMenuButtonColor?: string;
  accentColor?: string;
  changeMenuColorOnOpen?: boolean;
  closeOnClickAway?: boolean;
  onMenuOpen?: () => void;
  onMenuClose?: () => void;
}

export const StaggeredMenu: React.FC<StaggeredMenuProps> = ({
  position = 'right',
  colors = ['#0d2a1e', '#10b981'],
  items = [],
  socialItems = [],
  displaySocials = false,
  displayItemNumbering = true,
  menuButtonColor = '#e9e9ef',
  openMenuButtonColor = '#10b981',
  accentColor = '#10b981',
  changeMenuColorOnOpen = true,
  closeOnClickAway = true,
  onMenuOpen,
  onMenuClose,
}) => {
  const [open, setOpen] = useState(false);
  const openRef = useRef(false);
  const panelRef = useRef<any>(null);
  const preLayersRef = useRef<any>(null);
  const preLayerElsRef = useRef<Element[]>([]);
  const plusHRef = useRef<any>(null);
  const plusVRef = useRef<any>(null);
  const iconRef = useRef<any>(null);
  const textInnerRef = useRef<any>(null);
  const [textLines, setTextLines] = useState(['Menu', 'Close']);

  const openTlRef = useRef<any>(null);
  const closeTweenRef = useRef<any>(null);
  const spinTweenRef = useRef<any>(null);
  const textCycleAnimRef = useRef<any>(null);
  const colorTweenRef = useRef<any>(null);
  const toggleBtnRef = useRef<any>(null);
  const busyRef = useRef(false);
  const router = useRouter();

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const panel = panelRef.current;
      const preContainer = preLayersRef.current;
      const plusH = plusHRef.current;
      const plusV = plusVRef.current;
      const icon = iconRef.current;
      const textInner = textInnerRef.current;
      if (!panel || !plusH || !plusV || !icon || !textInner) return;

      let preLayers: Element[] = [];
      if (preContainer) {
        preLayers = Array.from(preContainer.querySelectorAll('.sm-prelayer'));
      }
      preLayerElsRef.current = preLayers;

      const offscreen = position === 'left' ? -100 : 100;
      gsap.set([panel, ...preLayers], { xPercent: offscreen, opacity: 1 });
      if (preContainer) gsap.set(preContainer, { xPercent: 0, opacity: 1 });
      gsap.set(plusH, { transformOrigin: '50% 50%', rotate: 0 });
      gsap.set(plusV, { transformOrigin: '50% 50%', rotate: 90 });
      gsap.set(icon, { rotate: 0, transformOrigin: '50% 50%' });
      gsap.set(textInner, { yPercent: 0 });
      if (toggleBtnRef.current) gsap.set(toggleBtnRef.current, { color: menuButtonColor });
    });
    return () => ctx.revert();
  }, [menuButtonColor, position]);

  const buildOpenTimeline = useCallback(() => {
    const panel = panelRef.current;
    const layers = preLayerElsRef.current;
    if (!panel) return null;

    openTlRef.current?.kill();
    if (closeTweenRef.current) { closeTweenRef.current.kill(); closeTweenRef.current = null; }

    const itemEls = Array.from(panel.querySelectorAll('.sm-panel-itemLabel'));
    const numberEls = Array.from(panel.querySelectorAll('.sm-panel-list[data-numbering] .sm-panel-item'));
    const socialTitle = panel.querySelector('.sm-socials-title');
    const socialLinks = Array.from(panel.querySelectorAll('.sm-socials-link'));

    const offscreen = position === 'left' ? -100 : 100;

    if (itemEls.length) gsap.set(itemEls, { yPercent: 140, rotate: 10 });
    if (numberEls.length) gsap.set(numberEls, { '--sm-num-opacity': 0 });
    if (socialTitle) gsap.set(socialTitle, { opacity: 0 });
    if (socialLinks.length) gsap.set(socialLinks, { y: 25, opacity: 0 });

    const tl = gsap.timeline({ paused: true });
    layers.forEach((el, i) => {
      tl.fromTo(el, { xPercent: offscreen }, { xPercent: 0, duration: 0.5, ease: 'power4.out' }, i * 0.07);
    });
    const lastTime = layers.length ? (layers.length - 1) * 0.07 : 0;
    const panelInsertTime = lastTime + (layers.length ? 0.08 : 0);
    const panelDuration = 0.65;

    tl.fromTo(panel, { xPercent: offscreen }, { xPercent: 0, duration: panelDuration, ease: 'power4.out' }, panelInsertTime);

    if (itemEls.length) {
      const itemsStart = panelInsertTime + panelDuration * 0.15;
      tl.to(itemEls, { yPercent: 0, rotate: 0, duration: 1, ease: 'power4.out', stagger: { each: 0.1 } }, itemsStart);
      if (numberEls.length) {
        tl.to(numberEls, { duration: 0.6, ease: 'power2.out', '--sm-num-opacity': 1, stagger: { each: 0.08 } }, itemsStart + 0.1);
      }
    }

    if (socialTitle || socialLinks.length) {
      const socialsStart = panelInsertTime + panelDuration * 0.4;
      if (socialTitle) tl.to(socialTitle, { opacity: 1, duration: 0.5, ease: 'power2.out' }, socialsStart);
      if (socialLinks.length) {
        tl.to(socialLinks, { y: 0, opacity: 1, duration: 0.55, ease: 'power3.out', stagger: { each: 0.08 } }, socialsStart + 0.04);
      }
    }

    openTlRef.current = tl;
    return tl;
  }, [position]);

  const playOpen = useCallback(() => {
    if (busyRef.current) return;
    busyRef.current = true;
    const tl = buildOpenTimeline();
    if (tl) {
      tl.eventCallback('onComplete', () => { busyRef.current = false; });
      tl.play(0);
    } else {
      busyRef.current = false;
    }
  }, [buildOpenTimeline]);

  const playClose = useCallback(() => {
    openTlRef.current?.kill();
    openTlRef.current = null;
    const panel = panelRef.current;
    const layers = preLayerElsRef.current;
    if (!panel) return;
    const all = [...layers, panel];
    closeTweenRef.current?.kill();
    const offscreen = position === 'left' ? -100 : 100;
    closeTweenRef.current = gsap.to(all, {
      xPercent: offscreen,
      duration: 0.32,
      ease: 'power3.in',
      overwrite: 'auto',
      onComplete: () => {
        const itemEls = Array.from(panel.querySelectorAll('.sm-panel-itemLabel'));
        if (itemEls.length) gsap.set(itemEls, { yPercent: 140, rotate: 10 });
        const numberEls = Array.from(panel.querySelectorAll('.sm-panel-list[data-numbering] .sm-panel-item'));
        if (numberEls.length) gsap.set(numberEls, { '--sm-num-opacity': 0 });
        const socialTitle = panel.querySelector('.sm-socials-title');
        const socialLinks = Array.from(panel.querySelectorAll('.sm-socials-link'));
        if (socialTitle) gsap.set(socialTitle, { opacity: 0 });
        if (socialLinks.length) gsap.set(socialLinks, { y: 25, opacity: 0 });
        busyRef.current = false;
      },
    });
  }, [position]);

  const animateIcon = useCallback((opening: boolean) => {
    const icon = iconRef.current;
    if (!icon) return;
    spinTweenRef.current?.kill();
    spinTweenRef.current = opening
      ? gsap.to(icon, { rotate: 225, duration: 0.8, ease: 'power4.out', overwrite: 'auto' })
      : gsap.to(icon, { rotate: 0, duration: 0.35, ease: 'power3.inOut', overwrite: 'auto' });
  }, []);

  const animateColor = useCallback((opening: boolean) => {
    const btn = toggleBtnRef.current;
    if (!btn) return;
    colorTweenRef.current?.kill();
    if (changeMenuColorOnOpen) {
      colorTweenRef.current = gsap.to(btn, {
        color: opening ? openMenuButtonColor : menuButtonColor,
        delay: 0.18, duration: 0.3, ease: 'power2.out',
      });
    } else {
      gsap.set(btn, { color: menuButtonColor });
    }
  }, [openMenuButtonColor, menuButtonColor, changeMenuColorOnOpen]);

  const animateText = useCallback((opening: boolean) => {
    const inner = textInnerRef.current;
    if (!inner) return;
    textCycleAnimRef.current?.kill();
    const currentLabel = opening ? 'Menu' : 'Close';
    const targetLabel = opening ? 'Close' : 'Menu';
    const seq = [currentLabel, targetLabel, targetLabel];
    setTextLines(seq);
    gsap.set(inner, { yPercent: 0 });
    const finalShift = ((seq.length - 1) / seq.length) * 100;
    textCycleAnimRef.current = gsap.to(inner, { yPercent: -finalShift, duration: 0.4, ease: 'power4.out' });
  }, []);

  const closeMenu = useCallback(() => {
    if (!openRef.current) return;
    openRef.current = false;
    setOpen(false);
    onMenuClose?.();
    playClose();
    animateIcon(false);
    animateColor(false);
    animateText(false);
  }, [playClose, animateIcon, animateColor, animateText, onMenuClose]);

  const toggleMenu = useCallback(() => {
    const target = !openRef.current;
    openRef.current = target;
    setOpen(target);
    if (target) {
      onMenuOpen?.();
      playOpen();
    } else {
      onMenuClose?.();
      playClose();
    }
    animateIcon(target);
    animateColor(target);
    animateText(target);
  }, [playOpen, playClose, animateIcon, animateColor, animateText, onMenuOpen, onMenuClose]);

  // Close on click away
  React.useEffect(() => {
    if (!closeOnClickAway || !open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target) &&
          toggleBtnRef.current && !toggleBtnRef.current.contains(e.target)) {
        closeMenu();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [closeOnClickAway, open, closeMenu]);

  // Handle navigation: navigate then close
  const handleItemClick = useCallback((e: React.MouseEvent, href: string) => {
    e.preventDefault();
    router.push(href);
    closeMenu();
  }, [router, closeMenu]);

  return (
    <div
      className="staggered-menu-wrapper"
      style={accentColor ? ({ '--sm-accent': accentColor } as React.CSSProperties) : undefined}
      data-position={position}
      data-open={open || undefined}
    >
      {/* Staggered pre-layers */}
      <div ref={preLayersRef} className="sm-prelayers" aria-hidden="true">
        {(() => {
          const raw = colors && colors.length ? colors.slice(0, 4) : ['#0d2a1e', '#10b981'];
          let arr = [...raw];
          if (arr.length >= 3) arr.splice(Math.floor(arr.length / 2), 1);
          return arr.map((c, i) => <div key={i} className="sm-prelayer" style={{ background: c }} />);
        })()}
      </div>

      {/* Top nav bar — brand left, menu button right */}
      <header className="staggered-menu-header" aria-label="Navigation">
        {/* Brand */}
        <Link href="/" className="sm-brand">
          <StegoShieldLogo className="sm-brand-icon" />
          <span className="sm-brand-name">INVISIFY</span>
          <span className="sm-brand-sub">SOC</span>
        </Link>

        {/* Menu toggle */}
        <button
          ref={toggleBtnRef}
          className="sm-toggle"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={toggleMenu}
          type="button"
        >
          <span ref={iconRef} className="sm-icon" aria-hidden="true">
            <span ref={plusHRef} className="sm-icon-line" />
            <span ref={plusVRef} className="sm-icon-line" style={{ transform: 'translate(-50%, -50%) rotate(90deg)' }} />
          </span>
          <span className="sm-toggle-textWrap" aria-hidden="true">
            <span ref={textInnerRef} className="sm-toggle-textInner">
              {textLines.map((l, i) => (
                <span className="sm-toggle-line" key={i}>{l}</span>
              ))}
            </span>
          </span>
        </button>
      </header>

      {/* Slide-out panel */}
      <aside ref={panelRef} className="staggered-menu-panel" aria-hidden={!open}>
        <div className="sm-panel-inner">
          {/* Status indicator */}
          <div className="sm-status">
            <span className="sm-status-text">System Online</span>
          </div>

          {/* Nav items */}
          <ul className="sm-panel-list" role="list" data-numbering={displayItemNumbering || undefined}>
            {items.length > 0 ? items.map((it, idx) => (
              <li className="sm-panel-itemWrap" key={it.label + idx}>
                <a
                  className="sm-panel-item"
                  href={it.link}
                  aria-label={it.ariaLabel}
                  data-index={idx + 1}
                  onClick={(e) => handleItemClick(e, it.link)}
                >
                  <span className="sm-panel-itemLabel">{it.label}</span>
                </a>
              </li>
            )) : (
              <li className="sm-panel-itemWrap" aria-hidden="true">
                <span className="sm-panel-item">
                  <span className="sm-panel-itemLabel">No items</span>
                </span>
              </li>
            )}
          </ul>

          <div className="sm-divider" />

          {displaySocials && socialItems.length > 0 && (
            <div className="sm-socials" aria-label="Social links">
              <h3 className="sm-socials-title">Socials</h3>
              <ul className="sm-socials-list" role="list">
                {socialItems.map((s, i) => (
                  <li key={s.label + i} className="sm-socials-item">
                    <a href={s.link} target="_blank" rel="noopener noreferrer" className="sm-socials-link">
                      {s.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="sm-version">v4.2.0 // Cascade Engine</div>
        </div>
      </aside>
    </div>
  );
};

export default StaggeredMenu;

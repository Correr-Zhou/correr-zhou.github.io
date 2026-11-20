'use client';

/**
 * Icon button with a small themed popover (email / address) that offers Copy + an action link.
 * The popover is portalled to <body> with position: fixed, so it always sits on the top layer
 * (above the sticky profile panel, the navigation bar and everything else).
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ComponentType, SVGProps } from 'react';
import { createPortal } from 'react-dom';
import { CheckIcon, DocumentDuplicateIcon } from '@heroicons/react/24/outline';

interface ContactPopoverProps {
    icon: ComponentType<SVGProps<SVGSVGElement>>;
    ariaLabel: string;
    title: string;
    lines: string[];
    copyText: string;
    action?: { label: string; href: string; external?: boolean; icon?: ComponentType<SVGProps<SVGSVGElement>> };
}

interface Placement { left: number; top: number; arrow: number; below: boolean }

export default function ContactPopover({ icon: Icon, ariaLabel, title, lines, copyText, action }: ContactPopoverProps) {
    const btnRef = useRef<HTMLButtonElement>(null);
    const popRef = useRef<HTMLDivElement>(null);
    const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const pinnedRef = useRef(false);
    const [mounted, setMounted] = useState(false);
    const [open, setOpen] = useState(false);
    const [pos, setPos] = useState<Placement | null>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => setMounted(true), []);

    const show = () => { clearTimeout(hideTimer.current); setOpen(true); };
    const hideSoon = () => {
        if (pinnedRef.current) return;
        clearTimeout(hideTimer.current);
        hideTimer.current = setTimeout(() => setOpen(false), 160); // time to move the pointer onto the popover
    };
    const close = () => { pinnedRef.current = false; setOpen(false); };

    // Place above the icon (or below if there's no room under the fixed nav), kept inside the viewport.
    const place = useCallback(() => {
        const b = btnRef.current?.getBoundingClientRect();
        const p = popRef.current;
        if (!b || !p) return;
        const margin = 8;
        const center = b.left + b.width / 2;
        const left = Math.max(margin, Math.min(center - p.offsetWidth / 2, window.innerWidth - p.offsetWidth - margin));
        let top = b.top - p.offsetHeight - 10;
        const below = top < 72 + margin;
        if (below) top = b.bottom + 10;
        setPos({ left, top, arrow: center - left, below });
    }, []);

    useLayoutEffect(() => { if (open) place(); else setPos(null); }, [open, place]);

    useEffect(() => {
        if (!open) return;
        const onMove = () => place();
        const onDown = (e: MouseEvent | TouchEvent) => {
            const t = e.target as Node;
            if (!btnRef.current?.contains(t) && !popRef.current?.contains(t)) close();
        };
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
        window.addEventListener('scroll', onMove, true);
        window.addEventListener('resize', onMove);
        document.addEventListener('mousedown', onDown);
        document.addEventListener('touchstart', onDown);
        document.addEventListener('keydown', onKey);
        return () => {
            window.removeEventListener('scroll', onMove, true);
            window.removeEventListener('resize', onMove);
            document.removeEventListener('mousedown', onDown);
            document.removeEventListener('touchstart', onDown);
            document.removeEventListener('keydown', onKey);
        };
    }, [open, place]);

    useEffect(() => () => clearTimeout(hideTimer.current), []);

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(copyText);
        } catch {
            const ta = document.createElement('textarea');
            ta.value = copyText;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            ta.remove();
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    return (
        <>
            <button
                ref={btnRef}
                type="button"
                aria-label={ariaLabel}
                aria-expanded={open}
                onMouseEnter={show}
                onMouseLeave={hideSoon}
                onClick={() => {
                    // Click toggles a "sticky" open state (useful on touch screens).
                    if (open && pinnedRef.current) close();
                    else { pinnedRef.current = true; show(); }
                }}
                className={`p-2 transition-colors duration-200 ${open ? 'text-accent' : 'text-neutral-600 dark:text-neutral-400 hover:text-accent'}`}
            >
                <Icon className="h-5 w-5" />
            </button>
            {mounted && open && createPortal(
                <div
                    ref={popRef}
                    role="dialog"
                    aria-label={title}
                    className="contact-pop"
                    style={{ left: pos?.left ?? 0, top: pos?.top ?? 0, visibility: pos ? 'visible' : 'hidden' }}
                    onMouseEnter={show}
                    onMouseLeave={hideSoon}
                >
                    <div className="contact-pop-title">{title}</div>
                    <div className="contact-pop-body">{lines.map((l, i) => <div key={i}>{l}</div>)}</div>
                    <div className="contact-pop-actions">
                        <button type="button" className="contact-pop-btn" onClick={() => void copy()}>
                            {copied ? <CheckIcon className="h-3.5 w-3.5" aria-hidden="true" /> : <DocumentDuplicateIcon className="h-3.5 w-3.5" aria-hidden="true" />}
                            {copied ? 'Copied' : 'Copy'}
                        </button>
                        {action && (
                            <a className="contact-pop-btn" href={action.href} {...(action.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
                                {action.icon && <action.icon className="h-3.5 w-3.5" aria-hidden="true" />}
                                {action.label}
                            </a>
                        )}
                    </div>
                    <span className={`contact-pop-arrow${pos?.below ? ' is-below' : ''}`} style={{ left: pos?.arrow ?? 0 }} />
                </div>,
                document.body,
            )}
        </>
    );
}

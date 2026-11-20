'use client';

import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useMessages } from '@/lib/i18n/useMessages';

export interface NewsItem {
    date: string;
    content: string;
}

interface NewsProps {
    items: NewsItem[];
    title?: string;
    visibleCount?: number;
}

export default function News({ items, title, visibleCount = 6 }: NewsProps) {
    const messages = useMessages();
    const resolvedTitle = title || messages.home.news;
    const listRef = useRef<HTMLDivElement>(null);
    const [maxHeight, setMaxHeight] = useState<number | undefined>(undefined);
    const scrollable = items.length > visibleCount;

    // Size the scroll box so exactly `visibleCount` rows are visible, even when rows wrap.
    useEffect(() => {
        const list = listRef.current;
        if (!list || !scrollable) return;
        const measure = () => {
            const rows = list.children;
            const last = rows[visibleCount - 1] as HTMLElement | undefined;
            if (last) setMaxHeight(last.offsetTop + last.offsetHeight - (rows[0] as HTMLElement).offsetTop + 2);
        };
        measure();
        window.addEventListener('resize', measure);
        return () => window.removeEventListener('resize', measure);
    }, [items, visibleCount, scrollable]);

    return (
        <section
            id="news"
            className="scroll-mt-24"
            aria-label={resolvedTitle}
        >
            <h2 className="text-2xl font-serif font-bold text-primary mb-4">{resolvedTitle}</h2>
            <div
                ref={listRef}
                className={`space-y-3 ${scrollable ? 'news-scroll overflow-y-auto pr-3' : ''}`}
                style={scrollable && maxHeight ? { maxHeight } : undefined}
                tabIndex={scrollable ? 0 : undefined}
            >
                {items.map((item, index) => (
                    <div key={`${item.date}-${index}`} className="flex items-start space-x-3">
                        <span className="text-xs text-neutral-500 mt-1 w-16 flex-shrink-0 tabular-nums">{item.date}</span>
                        <p className="text-sm text-neutral-700">
                            <ReactMarkdown components={{
                                p: ({ children }) => <span>{children}</span>,
                                strong: ({ children }) => <strong className="news-honor">{children}</strong>,
                                a: ({ children, href }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-accent font-medium hover:underline">{children}</a>,
                            }}>{item.content}</ReactMarkdown>
                        </p>
                    </div>
                ))}
            </div>
            {scrollable && <p className="mt-2 text-xs italic text-neutral-400">Scroll to see more ↓</p>}
        </section>
    );
}

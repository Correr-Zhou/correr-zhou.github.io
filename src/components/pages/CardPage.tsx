'use client';

import ReactMarkdown from 'react-markdown';
import { CardPageConfig } from '@/types/page';

const inline = {
    p: ({ children }: React.ComponentProps<'p'>) => <span>{children}</span>,
    a: ({ ...props }) => (
        <a {...props} target="_blank" rel="noopener noreferrer" className="text-accent font-medium underline-offset-[3px] hover:underline" />
    ),
    strong: ({ children }: React.ComponentProps<'strong'>) => <strong className="font-semibold text-primary">{children}</strong>,
    em: ({ children }: React.ComponentProps<'em'>) => <em className="italic">{children}</em>,
};

// Timeline-style list (date | rule + dot | title / subtitle / note) used for Teaching, Awards and Services.
export default function CardPage({ config, embedded = false }: { config: CardPageConfig; embedded?: boolean }) {
    // Consecutive items sharing a `group` are rendered under one sub-heading.
    const groups: { name?: string; items: CardPageConfig['items'] }[] = [];
    for (const item of config.items) {
        const last = groups[groups.length - 1];
        if (last && last.name === item.group) last.items.push(item);
        else groups.push({ name: item.group, items: [item] });
    }
    return (
        <section
        >
            <h2 className={`${embedded ? 'text-2xl' : 'text-4xl'} font-serif font-bold text-primary mb-4`}>{config.title}</h2>
            {groups.map((g, gi) => (
                <div key={gi} className={gi > 0 ? 'mt-5' : ''}>
                    {g.name && <h3 className="pub-subheading">{g.name}</h3>}
                    <ol className="entry-list">
                        {g.items.map((item, index) => (
                            <li key={index} className="entry-item">
                                {item.date && <div className="entry-date">{item.date}</div>}
                                <div className="entry-body">
                                    <div className="entry-title">{item.title}</div>
                                    {item.subtitle && <div className="entry-meta"><ReactMarkdown components={inline}>{item.subtitle}</ReactMarkdown></div>}
                                    {item.content && <div className="entry-note"><ReactMarkdown components={inline}>{item.content}</ReactMarkdown></div>}
                                    {item.tags && item.tags.length > 0 && <div className="entry-tags">{item.tags.join(' · ')}</div>}
                                </div>
                            </li>
                        ))}
                    </ol>
                </div>
            ))}
        </section>
    );
}

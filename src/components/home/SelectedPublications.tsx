'use client';

import { Author, Publication } from '@/types/publication';
import { useMessages } from '@/lib/i18n/useMessages';
import PublicationPreview from '@/components/publications/PublicationPreview';
import PublicationImpact from '@/components/publications/PublicationImpact';
import PublicationDetails from '@/components/publications/PublicationDetails';

interface SelectedPublicationsProps {
    publications: Publication[];
    title?: string;
    scholarUrl?: string;
}

function AuthorName({ author }: { author: Author }) {
    // Embedded owner name (e.g. "OpenWAM Team (Donghao Zhou as ...)"): emphasize only that part.
    if (author.highlightMatch) {
        const i = author.name.indexOf(author.highlightMatch);
        return <>
            {author.name.slice(0, i)}
            <span className="font-semibold text-primary">{author.highlightMatch}</span>
            {author.name.slice(i + author.highlightMatch.length)}
        </>;
    }
    return <span className={author.isHighlighted ? 'font-semibold text-primary' : ''}>{author.name}</span>;
}

function PublicationCard({ pub, messages }: { pub: Publication; messages: ReturnType<typeof useMessages> }) {
    const links = [
        { label: messages.publications.project, href: pub.url },
        { label: messages.publications.paper, href: pub.pdfUrl },
        { label: messages.publications.code, href: pub.code },
        { label: messages.publications.video, href: pub.video },
        { label: 'Poster', href: pub.poster },
        { label: 'Slides', href: pub.slides },
        { label: 'Talk', href: pub.talk },
    ].filter(link => link.href);
    return (
        <article className="publication-card">
            <div className="publication-card-layout">
                {pub.preview && <div className="publication-card-preview"><PublicationPreview preview={pub.preview} title={pub.title} sizes="(max-width: 639px) calc(100vw - 80px), 224px" /></div>}
                <div className="min-w-0 flex-1">
                    <h3 className="publication-card-title">
                        {(pub.url || pub.pdfUrl) ? <a href={pub.url || pub.pdfUrl} target="_blank" rel="noopener noreferrer">{pub.title}</a> : pub.title}
                    </h3>
                    <p className="publication-card-authors">
                        {pub.authors.map((author, idx) => <span key={`${author.name}-${idx}`}><AuthorName author={author} />{author.isCoAuthor && <sup className={author.isHighlighted ? 'font-semibold text-primary' : ''}>*</sup>}{author.isCorresponding && <sup className={author.isHighlighted ? 'font-semibold text-primary' : ''}>†</sup>}{idx < pub.authors.length - 1 ? ', ' : ''}</span>)}
                    </p>
                    <PublicationDetails publication={pub} />
                    <div className="publication-links-row">
                        {links.map(link => <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer" className="publication-resource-link">{link.label}</a>)}
                        <PublicationImpact publication={pub} />
                    </div>
                </div>
            </div>
        </article>
    );
}

export default function SelectedPublications({ publications, title, scholarUrl }: SelectedPublicationsProps) {
    const messages = useMessages();
    const published = publications.filter(p => !p.preprint);
    const preprints = publications.filter(p => p.preprint);
    return (
        <section id="selected-publications" className="scroll-mt-24">
            <div className="mb-5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
                <h2 className="text-2xl font-serif font-bold text-primary">{title || messages.home.selectedPublications}</h2>
                {scholarUrl && <a href={scholarUrl} target="_blank" rel="noopener noreferrer" className="ml-auto shrink-0 text-sm font-medium text-accent underline-offset-[3px] hover:underline">{messages.home.allPublications} ↗</a>}
            </div>
            <p className="-mt-3 mb-4 text-xs text-neutral-500">
                <sup>*</sup> Equal Contribution &nbsp;·&nbsp; <sup>†</sup> Project Lead
            </p>
            {published.length > 0 && <>
                <h3 className="pub-subheading">Published</h3>
                <div className="space-y-5">
                    {published.map(pub => <PublicationCard key={pub.id} pub={pub} messages={messages} />)}
                </div>
            </>}
            {preprints.length > 0 && <>
                <h3 className="pub-subheading mt-8">Preprint</h3>
                <div className="space-y-5">
                    {preprints.map(pub => <PublicationCard key={pub.id} pub={pub} messages={messages} />)}
                </div>
            </>}
        </section>
    );
}

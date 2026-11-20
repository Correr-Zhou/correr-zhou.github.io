import ReactMarkdown from 'react-markdown';
import { Publication } from '@/types/publication';

function InlineMarkdown({ children }: { children: string }) {
    return <ReactMarkdown components={{
        p: ({ children }) => <span>{children}</span>,
        a: props => <a {...props} target="_blank" rel="noopener noreferrer" />,
    }}>{children}</ReactMarkdown>;
}

export default function PublicationDetails({ publication }: { publication: Publication }) {
    // Text-area venue line: parenthetical acronym (or full name) + year. Honor lives on the image badge.
    const venue = (publication.journal || publication.conference || '').match(/\(([^)]+)\)\s*$/)?.[1]
        || publication.journal || publication.conference;
    const description = publication.description?.replace(
        /^(?:IEEE\s+)?(?:CVPR|ICLR|AAAI|NeurIPS|TPAMI|ICCV|ECCV)\s+\d{4}(?:\s+(?:Highlight|Oral|Spotlight))?\.\s*/i, '');

    return <>
        <p className="publication-card-venue venue-mark-star" title={publication.journal || publication.conference}>
            <span>{venue}{publication.preprint ? '' : ` ${publication.year}`}</span>
            {publication.honor && <span className="publication-card-honor"><InlineMarkdown>{publication.honor}</InlineMarkdown></span>}
        </p>
        <p className="publication-card-description">
            {publication.impact ? <span className="publication-impact-copy"><InlineMarkdown>{publication.impact}</InlineMarkdown></span> : description}
        </p>
    </>;
}

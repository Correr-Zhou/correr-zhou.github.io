'use client';

import { useEffect, useState } from 'react';
import { Publication } from '@/types/publication';
import { useLocaleStore } from '@/lib/stores/localeStore';
import snapshot from '@/data/publicationMetrics.json';

interface Metrics {
    citations?: number;
    citationsUpdatedAt?: string;
    scholarUrl?: string;
    githubRepo?: string;
    stars?: number;
    starsUpdatedAt?: string;
}

// Brand marks from Simple Icons (CC0): Google Scholar and GitHub.
const ScholarIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M5.242 13.769L0 9.5 12 0l12 9.5-5.242 4.269C17.548 11.249 14.978 9.5 12 9.5c-2.977 0-5.548 1.748-6.758 4.269zM12 10a7 7 0 1 0 0 14 7 7 0 0 0 0-14z" /></svg>;
const GitHubIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" /></svg>;

// Share requests between the homepage and publication list (including the shared ++ repository).
const starRequests = new Map<string, Promise<number>>();
function fetchStars(repo: string) {
    if (!starRequests.has(repo)) {
        starRequests.set(repo, fetch(`https://img.shields.io/github/stars/${repo}.json`, {
            signal: AbortSignal.timeout(8000),
        }).then(async (response) => {
            if (!response.ok) throw new Error('Stars unavailable');
            const data = await response.json();
            const value = Number(String(data.message).replace(/,/g, ''));
            if (!Number.isInteger(value) || value < 0) throw new Error('Invalid star count');
            return value;
        }));
    }
    return starRequests.get(repo)!;
}

export default function PublicationImpact({ publication }: { publication: Publication }) {
    const isZh = useLocaleStore(state => state.locale).startsWith('zh');
    const metrics = (snapshot.publications as Record<string, Metrics>)[publication.id];
    const [stars, setStars] = useState(metrics?.stars);
    const [starsDate, setStarsDate] = useState(metrics?.starsUpdatedAt);

    useEffect(() => {
        let active = true;
        setStars(metrics?.stars);
        setStarsDate(metrics?.starsUpdatedAt);
        if (metrics?.githubRepo) {
            void fetchStars(metrics.githubRepo).then(count => {
                if (active) { setStars(count); setStarsDate(new Date().toISOString()); }
            }).catch(() => {}); // Preserve the dated snapshot when the source is unavailable.
        }
        return () => { active = false; };
    }, [metrics]);

    const updatedLabel = (date?: string) => date
        ? `${isZh ? '更新于' : 'Updated'} ${date.slice(0, 10)}` : '';

    if (!metrics) return null;

    // Display rules: citations shown only when > 100; GitHub stars shown only when >= 100.
    const showCitations = metrics.citations !== undefined && metrics.citations > 100;
    const showStars = metrics.githubRepo !== undefined && stars !== undefined && stars >= 100;
    if (!showCitations && !showStars) return null;

    return (
            <span className="publication-metrics">
                {showCitations && <a href={metrics.scholarUrl} target="_blank" rel="noopener noreferrer" title={`Google Scholar · ${updatedLabel(metrics.citationsUpdatedAt)}`}>
                    <ScholarIcon /><strong>{metrics.citations!.toLocaleString()} {isZh ? '次引用' : 'citations'}</strong>
                </a>}
                {showStars && <a href={`https://github.com/${metrics.githubRepo}`} target="_blank" rel="noopener noreferrer" title={`GitHub · ${updatedLabel(starsDate)}`}>
                    <GitHubIcon /><strong>{stars!.toLocaleString()} Stars</strong>
                </a>}
            </span>
    );
}

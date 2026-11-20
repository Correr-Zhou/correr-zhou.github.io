"""Refresh public metrics; keep each last verified value when a source is unavailable.

Uses exact Scholar article IDs, not title matching or sums of duplicate entries.
No authentication or CAPTCHA bypass is attempted for Google Scholar.
"""
import json
import os
import sys
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class ScholarParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.counts = {}
        self.key = None
        self.count_text = []
        self.in_count = False
        self.in_row = False

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'tr' and 'gsc_a_tr' in attrs.get('class', '').split():
            self.in_row = True
            self.key = None
            self.count_text = []
        if not self.in_row:
            return
        if tag == 'a':
            query = urllib.parse.parse_qs(urllib.parse.urlparse(attrs.get('href', '')).query)
            if 'citation_for_view' in query:
                self.key = query['citation_for_view'][0].split(':')[-1]
        if tag == 'td' and 'gsc_a_c' in attrs.get('class', '').split():
            self.in_count = True

    def handle_data(self, data):
        if self.in_count:
            self.count_text.append(data)

    def handle_endtag(self, tag):
        if tag == 'td':
            self.in_count = False
        if tag == 'tr' and self.in_row:
            count = ''.join(self.count_text).strip().replace(',', '')
            if self.key and (count.isdigit() or count == ''):
                self.counts[self.key] = int(count or 0)
            self.in_row = False


def request(url, github=False):
    headers = {'User-Agent': 'Mozilla/5.0 (AcademicHomepageMetrics)', 'Accept': '*/*'}
    if github and os.getenv('GITHUB_TOKEN'):
        headers['Authorization'] = 'Bearer ' + os.environ['GITHUB_TOKEN']
    with urllib.request.urlopen(urllib.request.Request(url, headers=headers), timeout=20) as response:
        return response.read().decode(response.headers.get_content_charset() or 'utf-8', errors='replace')


def refresh(scholar_html=None):
    config = json.loads((ROOT / 'content/publication-metrics.json').read_text())
    destination = ROOT / 'src/data/publicationMetrics.json'
    result = json.loads(destination.read_text()) if destination.exists() else {'publications': {}}
    now = datetime.now(timezone.utc).isoformat(timespec='seconds')
    warnings = []
    counts = {}
    try:
        source = scholar_html if scholar_html is not None else request(
            'https://scholar.google.com/citations?' + urllib.parse.urlencode(
                {'user': config['scholarUser'], 'hl': 'en', 'pagesize': 100}))
        parser = ScholarParser()
        parser.feed(source)
        counts = parser.counts
        if not counts:
            raise ValueError('No article rows returned; existing counts retained.')
    except Exception as error:
        warnings.append(f'Google Scholar: {error}')

    stars = {}
    for repo in sorted({p['githubRepo'] for p in config['publications'].values() if p.get('githubRepo')}):
        try:
            data = json.loads(request(f'https://api.github.com/repos/{repo}', github=True))
            value = data['stargazers_count']
        except Exception:
            try:
                data = json.loads(request(f'https://img.shields.io/github/stars/{repo}.json'))
                value = int(data['message'].replace(',', ''))
            except Exception as error:
                warnings.append(f'GitHub {repo}: {error}')
                continue
        if isinstance(value, int) and value >= 0:
            stars[repo] = value

    for publication_id, item in config['publications'].items():
        entry = result['publications'].setdefault(publication_id, {})
        # scholarKey is optional: an entry may track GitHub stars only.
        key = item.get('scholarKey')
        if key:
            entry['scholarUrl'] = 'https://scholar.google.com/citations?' + urllib.parse.urlencode({
                'view_op': 'view_citation', 'user': config['scholarUser'],
                'citation_for_view': f"{config['scholarUser']}:{key}", 'hl': 'en'})
            if key in counts:
                entry.update(citations=counts[key], citationsUpdatedAt=now)
            elif counts:
                warnings.append(f'Missing Scholar article {publication_id}; previous value retained.')
        else:
            for field in ('scholarUrl', 'citations', 'citationsUpdatedAt'):
                entry.pop(field, None)
        repo = item.get('githubRepo')
        if not repo:
            for field in ('githubRepo', 'stars', 'starsUpdatedAt'):
                entry.pop(field, None)
        if repo:
            entry['githubRepo'] = repo
            if repo in stars:
                entry.update(stars=stars[repo], starsUpdatedAt=now)

    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(result, indent=2, ensure_ascii=False) + '\n')
    for warning in warnings:
        print(f'Warning: {warning}', file=sys.stderr)
    print(f"Updated {len(counts)} Scholar entries and {len(stars)} GitHub repositories.")


if __name__ == '__main__':
    refresh()

'use client';

/**
 * A just-for-fun on-device chatbot under the profile icons, powered by WebLLM.
 *
 *  - Never slows the page: nothing heavy loads with the page. The library and the model
 *    (one-time download, then cached by the browser) load only after the visitor clicks.
 *  - Never shows when it can't work: rendered only on secure contexts with WebGPU, enough
 *    memory, no data-saver and not on small touch screens. Any failure hides it again.
 *  - Knowledge comes from the papers rendered on the page (kept in sync automatically) plus
 *    the profile facts below; the paper(s) a question mentions are placed first.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PaperAirplaneIcon, SparklesIcon } from '@heroicons/react/24/outline';
import type { Publication } from '@/types/publication';

const WEBLLM_URL = 'https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.87/+esm';
const WEBLLM_HOME = 'https://webllm.mlc.ai/';
// Same weights in two builds (~280 MB each): fp16 shaders where supported, fp32 otherwise.
const MODEL_F16 = 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC';
const MODEL_F32 = 'Qwen2.5-0.5B-Instruct-q4f32_1-MLC';
const MODEL_MB = 280;

const SUGGESTIONS = ['Hi! Who are you?', 'What does Donghao work on?', 'How can I reach him?'];

const PERSONA = `You are a small, friendly chatbot on Donghao Zhou's academic homepage. You are NOT Donghao: always refer to him as "Donghao" or "he", never as "I".

Rules:
1. Answer in 1-3 short sentences. Do not use emoji or dash characters.
2. Use ONLY the FACTS below. Copy names, venues and titles exactly. Never invent details, dates, numbers, opinions or personal preferences.
3. If the FACTS do not answer a question about Donghao (for example hobbies, food or personal life), reply: "I'm not sure about that. You could email Donghao at dhzhou@link.cuhk.edu.hk."
4. Reply in the same language as the visitor.`;

const PROFILE_FACTS = `- Donghao Zhou (Chinese name 周冬豪) is a third-year Ph.D. student in Computer Science and Engineering (CSE) at The Chinese University of Hong Kong (CUHK).
- His Ph.D. advisors are Prof. Pheng-Ann Heng and Prof. Chi-Wing Fu (Philip).
- Research interests: Donghao aims to push the frontier of General and Scalable Multimodal Intelligence. Recently he focuses on training Generative Foundation Models (OmniShow, ThinkV2V). He is also interested in exploring Embodied AI (OpenWAM, PackLab) and Agentic Systems and Evaluation (UniWeaver, DisCo-Layout, MMDeepResearch-Bench). Ultimately, he hopes to build AI that can understand, align with, and act on human intention, and in turn shape the world.
- Contact: email dhzhou@link.cuhk.edu.hk; GitHub Correr-Zhou; Google Scholar profile linked on this page. He is open to research collaboration.
- Experience: research intern at Tencent YouTu Lab (2023), research intern at Zhejiang Lab (2022), research assistant at the Shenzhen Institute of Advanced Technology (SIAT), Chinese Academy of Sciences (2021).
- Selected awards: CUHK Postgraduate Scholarship (2024-2028); Outstanding Graduate of Beijing (2024); Postgraduate National Scholarship, Ministry of Education (2023); Undergraduate National Scholarship, Ministry of Education (2020).
- Teaching (teaching assistant at CUHK): CSCI3260 Principles of Computer Graphics; CSCI1550 Computer Principles and Python Programming; AIST1110 Introduction to Computing using Python.
- Academic service: conference reviewer / program committee member for ICML, NeurIPS, ICLR, CVPR, ICCV, ECCV, AAAI, AISTATS, BMVC, ACCV and WACV; journal reviewer for IEEE TIFS and Scientific Reports.
- Invited talks: OmniShow at a tech sharing hosted by Tencent IEG (2026); subcellular structure prediction, a topic talk hosted by TechBeat (2023); single positive multi-label learning, a Youth Ph.D. Talk hosted by ITIC and AI TIME (2022).`;

/** Instant, always-correct replies for the most common intents; everything else goes to the model. */
function cannedReply(q: string): string | null {
    const t = q.toLowerCase();
    const zh = /[\u4e00-\u9fff]/.test(q);
    if (/(contact|reach|e-?mail|get in touch)|联系|邮箱|邮件/.test(t)) {
        return zh
            ? '可以发邮件给 Donghao：dhzhou@link.cuhk.edu.hk。他的 GitHub 是 Correr-Zhou，也欢迎科研合作的交流。'
            : 'You can email Donghao at dhzhou@link.cuhk.edu.hk. He is also on GitHub as Correr-Zhou, and he is open to research collaboration.';
    }
    if (/^\s*(hi|hello|hey|yo|hiya)\b|who are you|what are you|^\s*(你好|嗨|哈喽)|你是谁/.test(t)) {
        return zh
            ? '你好！我是一个直接跑在你浏览器里的迷你 AI 聊天机器人，可以和你聊聊 Donghao 的研究、论文，或者怎么联系他。'
            : "Hi! I'm a tiny AI chatbot running right inside your browser. Ask me about Donghao's research, his papers, or how to reach him!";
    }
    if (/(favou?rite|hobb(y|ies)|\bfood\b|\beat\b|girlfriend|boyfriend|married|single\?|how old|\bage\b|salary|birthday)|喜欢|爱好|年龄|女朋友|男朋友|生日|吃什么|结婚/.test(t)) {
        return zh
            ? '这个我不太确定，可以发邮件问问 Donghao 本人：dhzhou@link.cuhk.edu.hk。'
            : "I'm not sure about that. You could ask Donghao himself at dhzhou@link.cuhk.edu.hk.";
    }
    return null;
}

interface PaperFact { name: string; keys: string[]; venueKey: string; line: string }

function paperFacts(papers: Publication[]): PaperFact[] {
    return papers.map((p) => {
        const name = p.alias || (p.title.includes(':') ? p.title.split(':')[0].trim() : p.title);
        const venueShort = p.preprint ? 'arXiv' : ((p.journal || p.conference || '').match(/\(([^)]+)\)\s*$/)?.[1] || p.journal || p.conference || '');
        const venue = p.preprint ? 'arXiv preprint' : `${venueShort} ${p.year}`;
        const honor = p.honor ? ` (${p.honor.replace(/\*\*/g, '')})` : '';
        const summary = (p.impact || p.description || '').replace(/\*\*/g, '').trim();
        const me = p.authors.findIndex((a) => a.isHighlighted);
        const a = p.authors[me];
        let role = '';
        if (a) {
            if (a.highlightMatch) role = 'core contributor (as part of the OpenWAM Team)';
            else role = [a.isCoAuthor ? 'co-first author' : me === 0 ? 'first author' : 'co-author', a.isCorresponding ? 'project lead' : ''].filter(Boolean).join(' and ');
        }
        const keys = [name, ...(p.alias ? p.alias.split(/[()]/) : [])].map((k) => k.trim()).filter((k) => k.length > 2);
        return {
            name, keys, venueKey: venueShort.split(/[\s@]+/).pop() || venueShort,
            line: `- ${name}: "${p.title}", ${venue}${honor}. ${summary}${role ? ` Donghao's role: ${role}.` : ''}`,
        };
    });
}

/** Display rules for model output: no emoji, no dash characters. */
const tidy = (t: string) => t.replace(/\p{Extended_Pictographic}\uFE0F?/gu, '').replace(/\s*[—–]\s*/g, ', ').replace(/[ \t]{2,}/g, ' ');

const norm = (s: string) => ` ${s.toLowerCase().replace(/[^a-z0-9一-鿿]+/g, ' ').trim()} `;

/** System prompt with the papers a question mentions placed first (helps a tiny model stay on track). */
function buildSystemPrompt(question: string, facts: PaperFact[]): string {
    const q = norm(question);
    const compact = q.replace(/\s/g, '');
    let hits = facts.filter((f) => f.keys.some((k) => q.includes(norm(k)) || compact.includes(norm(k).replace(/\s/g, ''))));
    if (!hits.length) hits = facts.filter((f) => f.venueKey.length > 2 && q.includes(norm(f.venueKey))); // "papers at CVPR?"
    const papers = hits.length
        ? `Papers relevant to the question:\n${hits.map((f) => f.line).join('\n')}\nHis other papers (names only): ${facts.filter((f) => !hits.includes(f)).map((f) => f.name).join(', ')}.`
        : `Papers (peer-reviewed and preprints):\n${facts.map((f) => f.line).join('\n')}`;
    return `${PERSONA}\n\nFACTS ABOUT DONGHAO:\n${PROFILE_FACTS}\n\n${papers}`;
}

type Role = 'system' | 'user' | 'assistant';
interface ChatMessage { role: Role; content: string }
interface StreamChunk { choices: { delta: { content?: string } }[] }
interface Engine {
    chat: { completions: { create(req: { messages: ChatMessage[]; stream: true; temperature: number; max_tokens: number }): Promise<AsyncIterable<StreamChunk>> } };
}
interface WebLLMModule {
    CreateWebWorkerMLCEngine(worker: Worker, model: string, opts: { initProgressCallback: (r: { progress: number; text: string }) => void }): Promise<Engine>;
}
type GPUish = { requestAdapter(): Promise<{ features: { has(f: string): boolean } } | null> };

/** Returns the model build this device can run, or the reason it can't run any. */
async function pickModel(): Promise<{ model: string } | { reason: string }> {
    try {
        const nav = navigator as Navigator & { gpu?: GPUish; deviceMemory?: number; connection?: { saveData?: boolean } };
        if (!window.isSecureContext) return { reason: 'not a secure context (WebGPU needs HTTPS or localhost)' };
        if (!nav.gpu) return { reason: 'WebGPU not available in this browser' };
        if (typeof Worker === 'undefined' || !('caches' in window)) return { reason: 'Web Workers / Cache API unavailable' };
        if (nav.connection?.saveData) return { reason: 'data-saver mode is on' };
        if (nav.deviceMemory !== undefined && nav.deviceMemory < 4) return { reason: `low device memory (${nav.deviceMemory} GB)` };
        if (window.matchMedia('(pointer: coarse)').matches && window.innerWidth < 768) return { reason: 'small touch-screen device' };
        const adapter = await nav.gpu.requestAdapter();
        if (!adapter) return { reason: 'no WebGPU adapter' };
        return { model: adapter.features.has('shader-f16') ? MODEL_F16 : MODEL_F32 };
    } catch (e) {
        return { reason: `capability check failed: ${String(e)}` };
    }
}

async function isModelCached(model: string): Promise<boolean> {
    try {
        if (!(await caches.has('webllm/model'))) return false;
        const keys = await (await caches.open('webllm/model')).keys();
        return keys.some((r) => r.url.includes(model));
    } catch {
        return false;
    }
}

type Phase = 'checking' | 'hidden' | 'idle' | 'loading' | 'ready';

export default function ProfileChat({ papers }: { papers: Publication[] }) {
    const [phase, setPhase] = useState<Phase>('checking');
    const [model, setModel] = useState(MODEL_F16);
    const [cached, setCached] = useState(false);
    const [stage, setStage] = useState('');
    const [mb, setMb] = useState<number | null>(null);
    const [shown, setShown] = useState(0);          // smoothed % shown on the bar
    const targetRef = useRef(0);                     // last % reported by WebLLM
    const ceilRef = useRef(4);                       // how far the bar may creep before the next report
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [busy, setBusy] = useState(false);
    const engineRef = useRef<Engine | null>(null);
    const pendingRef = useRef<string | null>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const facts = useMemo(() => paperFacts(papers), [papers]);

    // Debug hook (only with ?chatdebug in the URL): inspect the exact system prompt for a question.
    useEffect(() => {
        if (new URLSearchParams(window.location.search).has('chatdebug')) {
            Object.assign(window, { __chatPrompt: (q: string) => buildSystemPrompt(q, facts), __chatCanned: cannedReply });
        }
    }, [facts]);

    // Capability check, deferred until the browser is idle after the page has rendered.
    useEffect(() => {
        let cancelled = false;
        const run = async () => {
            const pick = await pickModel();
            if (cancelled) return;
            if ('reason' in pick) { console.info(`[ProfileChat] hidden: ${pick.reason}`); setPhase('hidden'); return; }
            setModel(pick.model);
            setCached(await isModelCached(pick.model));
            if (!cancelled) setPhase('idle');
        };
        const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
        if (w.requestIdleCallback) w.requestIdleCallback(() => void run(), { timeout: 3000 });
        else setTimeout(() => void run(), 1500);
        return () => { cancelled = true; };
    }, []);

    // WebLLM reports progress per weight shard, so between reports the bar creeps smoothly
    // toward the next shard boundary instead of looking frozen.
    useEffect(() => {
        if (phase !== 'loading') return;
        const id = setInterval(() => {
            setShown((s) => {
                const floor = Math.max(s, targetRef.current);
                return Math.min(99, floor + (Math.max(floor, ceilRef.current) - floor) * 0.06);
            });
        }, 120);
        return () => clearInterval(id);
    }, [phase]);

    useEffect(() => {
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
    }, [messages]);

    const ask = useCallback(async (question: string) => {
        const engine = engineRef.current;
        const q = question.trim();
        if (!engine || !q) return;
        const history = [...messages, { role: 'user' as const, content: q }];
        setInput('');
        const canned = cannedReply(q);
        if (canned) { setMessages([...history, { role: 'assistant', content: canned }]); return; }
        setMessages([...history, { role: 'assistant', content: '' }]);
        setBusy(true);
        try {
            const stream = await engine.chat.completions.create({
                messages: [{ role: 'system', content: buildSystemPrompt(q, facts) }, ...history.slice(-6)],
                stream: true, temperature: 0, max_tokens: 220,
            });
            let text = '';
            for await (const chunk of stream) {
                text += chunk.choices[0]?.delta?.content ?? '';
                setMessages([...history, { role: 'assistant', content: tidy(text) }]);
            }
        } catch (err) {
            console.warn('[ProfileChat] generation failed', err);
            setMessages([...history, { role: 'assistant', content: 'Sorry, I got a bit lost there. Please email Donghao instead.' }]);
        } finally {
            setBusy(false);
        }
    }, [messages, facts]);

    const start = useCallback(async (firstQuestion?: string) => {
        if (phase !== 'idle') return;
        pendingRef.current = firstQuestion ?? null;
        targetRef.current = 0; ceilRef.current = 4; setShown(0); setMb(null);
        setStage('Loading chat engine…');
        setPhase('loading');
        try {
            const webllm = (await import(/* webpackIgnore: true */ WEBLLM_URL)) as WebLLMModule;
            setStage(cached ? 'Loading model from cache…' : 'Downloading model…');
            const worker = new Worker('/chat-worker.js', { type: 'module' });
            engineRef.current = await webllm.CreateWebWorkerMLCEngine(worker, model, {
                initProgressCallback: (r) => {
                    const pct = Math.round((r.progress ?? 0) * 100);
                    targetRef.current = Math.max(targetRef.current, pct);
                    const shard = r.text.match(/\[(\d+)\/(\d+)\]/);
                    ceilRef.current = Math.min(99, targetRef.current + (shard ? 100 / Number(shard[2]) : 4));
                    const fetched = r.text.match(/(\d+)\s*MB (?:fetched|loaded)/i);
                    if (fetched) setMb(Number(fetched[1]));
                    if (pct >= 99 || /shader|compil/i.test(r.text)) setStage('Warming up…');
                },
            });
            setShown(100);
            setPhase('ready');
        } catch (err) {
            // Could not run on this device after all: remove the widget entirely.
            console.warn('[ProfileChat] on-device model unavailable', err);
            setPhase('hidden');
        }
    }, [phase, model, cached]);

    // Ask the suggestion the visitor clicked once the model is ready.
    useEffect(() => {
        if (phase === 'ready' && pendingRef.current) {
            const q = pendingRef.current;
            pendingRef.current = null;
            void ask(q);
        }
    }, [phase, ask]);

    if (phase === 'checking' || phase === 'hidden') return null;

    return (
        <div className="profile-chat">
            <div className="profile-chat-head">
                <SparklesIcon className="h-4 w-4 profile-chat-icon" aria-hidden="true" />
                <span className="profile-chat-title">Ask about me</span>
                <a className="profile-chat-pill" href={WEBLLM_HOME} target="_blank" rel="noopener noreferrer">Powered by WebLLM</a>
            </div>

            {phase === 'idle' && (
                <>
                    <p className="profile-chat-intro">A tiny just-for-fun AI chatbot that runs entirely in your browser. Ask it about me, but don&apos;t take it too seriously :)</p>
                    <div className="profile-chat-suggestions">
                        {SUGGESTIONS.map((s) => (
                            <button key={s} type="button" className="profile-chat-chip" onClick={() => void start(s)}>{s}</button>
                        ))}
                    </div>
                    <button type="button" className="profile-chat-start" onClick={() => void start()}>Start Chat</button>
                    <p className="profile-chat-note">
                        {cached ? 'Model in your browser. Starts in seconds.' : 'Model loads to your browser on first use.'}
                    </p>
                </>
            )}

            {phase === 'loading' && (
                <div className="profile-chat-loading" aria-live="polite">
                    <div className="profile-chat-bar"><div style={{ width: `${Math.max(3, Math.round(shown))}%` }} /></div>
                    <div className="profile-chat-progress">
                        <span>{stage}</span>
                        <span>{mb !== null && !cached ? `${mb} / ~${MODEL_MB} MB` : `${Math.round(shown)}%`}</span>
                    </div>
                </div>
            )}

            {phase === 'ready' && (
                <>
                    <div ref={listRef} className="profile-chat-list" aria-live="polite">
                        {messages.length === 0 && <div className="profile-chat-msg is-bot">Hi! I&apos;m a tiny chatbot. Ask me about Donghao&apos;s research, papers or how to reach him.</div>}
                        {messages.map((m, i) => (
                            <div key={i} className={m.role === 'user' ? 'profile-chat-msg is-user' : 'profile-chat-msg is-bot'}>
                                {m.content || <span className="profile-chat-typing"><i /><i /><i /></span>}
                            </div>
                        ))}
                    </div>
                    <form className="profile-chat-form" onSubmit={(e) => { e.preventDefault(); if (!busy) void ask(input); }}>
                        <input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Say hi…"
                            aria-label="Chat with Donghao's AI buddy"
                            maxLength={300}
                        />
                        <button type="submit" disabled={busy || !input.trim()} aria-label="Send">
                            <PaperAirplaneIcon className="h-4 w-4" />
                        </button>
                    </form>
                    <p className="profile-chat-note">AI can be wrong. Check the page for details.</p>
                </>
            )}
        </div>
    );
}

'use client';

/**
 * Affiliation badges that behave like coins dropped into a jar.
 *
 * The avatar frame is treated as an open-topped container: on load each badge falls in
 * from a random spot above, bounces off the walls and the other badges, then settles at
 * the bottom. Sweeping the cursor through them imparts velocity, so they scatter and
 * rattle around the frame. Physics is matter-js
 * (loaded lazily, so the bundle cost is only paid when the effect actually runs); the
 * badges are plain DOM nodes so the logos stay crisp vectors and the caption stays
 * upright while a badge spins.
 */

import { useEffect, useRef, useState } from 'react';

type Affiliation = {
    id: string;
    label: string;
    src: string;
    /** Logo size as a fraction of the badge diameter — tuned per mark so they read evenly. */
    scale: number;
};

const AFFILIATIONS: Affiliation[] = [
    // The full emblem (shield + ribbon) is ~3:2, so it needs a wider box than the
    // squarer marks to end up looking the same weight inside the circle.
    { id: 'cuhk', label: 'CUHK', src: '/logos/cuhk.svg', scale: 0.78 },
    { id: 'qwen', label: 'Alibaba Qwen Team', src: '/logos/qwen.svg', scale: 0.54 },
    { id: 'bytedance', label: 'ByteDance', src: '/logos/bytedance.svg', scale: 0.56 },
    { id: 'youtu', label: 'Tencent Youtu Lab', src: '/logos/youtu.svg', scale: 0.60 },
];

/** Matches the avatar's `rounded-2xl` so badges never rest on top of a rounded corner. */
const CORNER_RADIUS = 16;

/**
 * Below this frame width the badges would be ~18px each — too small for the logos to read,
 * and they would cover most of the face. The avatar drops to 100px in the single-column
 * layout (under 1024px), so this is what actually switches the effect off on small screens.
 */
const MIN_FRAME = 150;

/** Give up on the geo lookup quickly — the badges are decoration, not content. */
const REGION_TIMEOUT_MS = 1500;
const REGION_CACHE_KEY = 'aff-badges-region';

/**
 * Ask where the visitor is, from the browser. The site is a static export with no
 * server, so there is no request-time IP to read; these two endpoints report the
 * country of the caller's own address and need no key. Returns null when nothing
 * answers, and the caller treats "unknown" as "show the badges" so an ad blocker
 * or an offline moment does not silently kill the effect for everyone.
 */
async function lookupRegion(): Promise<string | null> {
    const attempts: [string, (body: string) => string | null][] = [
        // Plain text: one `loc=XX` line among the other diagnostics.
        ['https://www.cloudflare.com/cdn-cgi/trace', (t) => t.match(/^loc=([A-Za-z]{2})$/m)?.[1] ?? null],
        ['https://get.geojs.io/v1/ip/country.json', (t) => {
            try {
                const parsed: unknown = JSON.parse(t);
                const code = (parsed as { country?: unknown })?.country;
                return typeof code === 'string' && /^[A-Za-z]{2}$/.test(code) ? code : null;
            } catch { return null; }
        }],
    ];
    for (const [url, parse] of attempts) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), REGION_TIMEOUT_MS);
        try {
            const response = await fetch(url, { signal: controller.signal, cache: 'no-store' });
            if (!response.ok) continue;
            const code = parse(await response.text());
            if (code) return code.toUpperCase();
        } catch {
            /* unreachable, blocked or timed out — fall through to the next one */
        } finally {
            clearTimeout(timer);
        }
    }
    return null;
}

/** One lookup per page load, however often the component remounts. */
let pendingRegion: Promise<string | null> | null = null;
function resolveRegion(): Promise<string | null> {
    if (!pendingRegion) pendingRegion = lookupRegion();
    return pendingRegion;
}

type Props = {
    /** ISO country codes that should not see the badges. Empty means no lookup at all. */
    hideRegions?: string[];
};

export default function AffiliationBadges({ hideRegions }: Props) {
    const hostRef = useRef<HTMLDivElement>(null);
    const badgeRefs = useRef<(HTMLDivElement | null)[]>([]);
    const [radius, setRadius] = useState(19);
    const [ready, setReady] = useState(false);
    const [enabled, setEnabled] = useState(true);
    const [hovered, setHovered] = useState<string | null>(null);
    const [epoch, setEpoch] = useState(0);
    // null while the region is still unknown, so the badges never flash in and then vanish.
    const [regionOk, setRegionOk] = useState<boolean | null>(null);

    const blockList = (hideRegions ?? []).map((code) => code.trim().toUpperCase()).filter(Boolean);
    const blockKey = blockList.join(',');

    useEffect(() => {
        if (!blockKey) { setRegionOk(true); return; }
        const blocked = new Set(blockKey.split(','));
        let cancelled = false;
        const settle = (code: string | null) => {
            if (!cancelled) setRegionOk(!code || !blocked.has(code));
        };
        let cached: string | null = null;
        try { cached = sessionStorage.getItem(REGION_CACHE_KEY); } catch { /* private mode */ }
        if (cached !== null) { settle(cached || null); return; }
        resolveRegion().then((code) => {
            try { sessionStorage.setItem(REGION_CACHE_KEY, code ?? ''); } catch { /* private mode */ }
            settle(code);
        });
        return () => { cancelled = true; };
    }, [blockKey]);

    // Rebuild the simulation when the frame changes size — crossing the layout breakpoint
    // swaps a 224px avatar for a 100px one, and a world built for the old size is wrong.
    useEffect(() => {
        const host = hostRef.current;
        if (!host || typeof ResizeObserver === 'undefined') return;
        let last = host.clientWidth;
        const observer = new ResizeObserver(() => {
            const next = host.clientWidth;
            if (Math.abs(next - last) < 8) return;
            last = next;
            setEpoch((e) => e + 1);
        });
        observer.observe(host);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        const host = hostRef.current;
        if (!host) return;

        const reduceMotion =
            typeof window.matchMedia === 'function' &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        const width = host.clientWidth;
        const height = host.clientHeight;
        if (!width || !height) return;

        // Same spirit as the chatbot's gate: skip small touch screens, where there is no
        // cursor to flick the badges with and the frame is too cramped to show them.
        // Visitors in an excluded region never get the simulation at all.
        if (regionOk !== true) {
            setReady(false);
            setEnabled(false);
            return;
        }

        const smallTouch =
            typeof window.matchMedia === 'function' &&
            window.matchMedia('(pointer: coarse)').matches &&
            window.innerWidth < 768;
        if (smallTouch || width < MIN_FRAME) {
            setReady(false);
            setEnabled(false);
            return;
        }
        setEnabled(true);

        // Badge size scales with the frame so the four of them always fit in one row.
        const r = Math.max(9, Math.min(22, width * 0.088));
        setRadius(r);
        const inset = Math.max(2, width * 0.012);

        // Reduced motion: lay them out at rest along the floor, no simulation at all.
        if (reduceMotion) {
            const gap = 4;
            const total = AFFILIATIONS.length * (r * 2) + (AFFILIATIONS.length - 1) * gap;
            let x = (width - total) / 2;
            badgeRefs.current.forEach((el) => {
                if (!el) return;
                el.style.transform = `translate3d(${x}px, ${height - r * 2 - inset}px, 0)`;
                x += r * 2 + gap;
            });
            setReady(true);
            return;
        }

        let disposed = false;
        let raf = 0;
        let detach = () => {};

        (async () => {
            const Matter = await import('matter-js');
            if (disposed) return;
            const { Engine, Bodies, Composite, Body } = Matter;

            const engine = Engine.create();
            engine.gravity.y = 1.15;
            const world = engine.world;

            // Walls: a thick floor, chamfers across the two rounded bottom corners, and side
            // walls that run far above the frame. The jar has no lid, so a good flick throws a
            // badge up out of the top of the avatar before it drops back in — but the sides
            // still hold it, so nothing wanders off across the page.
            const t = 80;
            const headroom = 520;
            const corner = Math.min(CORNER_RADIUS, width * 0.18);
            const chamferOffset = t / 2 - 1;
            Composite.add(world, [
                Bodies.rectangle(width / 2, height - inset + t / 2, width + t * 4, t, { isStatic: true, restitution: 0.18, friction: 0.4 }),
                Bodies.rectangle(inset - t / 2, height / 2 - headroom / 2, t, height + headroom, { isStatic: true, restitution: 0.35 }),
                Bodies.rectangle(width - inset + t / 2, height / 2 - headroom / 2, t, height + headroom, { isStatic: true, restitution: 0.35 }),
                Bodies.rectangle(
                    inset + corner / 2 - chamferOffset * Math.SQRT1_2,
                    height - inset - corner / 2 + chamferOffset * Math.SQRT1_2,
                    corner * 2.4, t, { isStatic: true, angle: -Math.PI / 4, restitution: 0.25 }
                ),
                Bodies.rectangle(
                    width - inset - corner / 2 + chamferOffset * Math.SQRT1_2,
                    height - inset - corner / 2 + chamferOffset * Math.SQRT1_2,
                    corner * 2.4, t, { isStatic: true, angle: Math.PI / 4, restitution: 0.25 }
                ),
            ]);

            const span = Math.max(1, width - r * 2 - inset * 2 - 8);
            const bodies = AFFILIATIONS.map((_, i) => {
                const body = Bodies.circle(
                    inset + r + 4 + Math.random() * span,
                    -60 - i * 115 - Math.random() * 60,
                    r,
                    { restitution: 0.5, friction: 0.07, frictionAir: 0.013, density: 0.0016 }
                );
                Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.3);
                Body.setVelocity(body, { x: (Math.random() - 0.5) * 3.4, y: 0 });
                return body;
            });
            Composite.add(world, bodies);

            // Cursor: only motion imparts velocity, so resting the pointer on a badge is calm
            // and sweeping across sends them flying.
            const cursor = { x: -9999, y: -9999, vx: 0, vy: 0, live: false };
            const onPointerMove = (event: PointerEvent) => {
                const box = host.getBoundingClientRect();
                const x = event.clientX - box.left;
                const y = event.clientY - box.top;
                if (cursor.live) {
                    cursor.vx = x - cursor.x;
                    cursor.vy = y - cursor.y;
                }
                cursor.x = x;
                cursor.y = y;
                cursor.live = true;
            };
            const onPointerLeave = () => {
                cursor.live = false;
                cursor.vx = 0;
                cursor.vy = 0;
                cursor.x = -9999;
                cursor.y = -9999;
            };
            host.addEventListener('pointermove', onPointerMove);
            host.addEventListener('pointerleave', onPointerLeave);

            let visible = true;
            const observer = new IntersectionObserver(
                ([entry]) => { visible = entry.isIntersecting; },
                { threshold: 0 }
            );
            observer.observe(host);

            const PUSH_RADIUS = r * 3.2;
            const MAX_SPEED = 24;
            let last = performance.now();

            const frame = (now: number) => {
                if (disposed) return;
                raf = requestAnimationFrame(frame);
                const dt = Math.min(32, now - last);
                last = now;
                if (!visible || document.hidden) return;

                if (cursor.live) {
                    const speed = Math.hypot(cursor.vx, cursor.vy);
                    if (speed > 0.4) {
                        for (const body of bodies) {
                            const dx = body.position.x - cursor.x;
                            const dy = body.position.y - cursor.y;
                            const dist = Math.hypot(dx, dy) || 0.001;
                            if (dist >= PUSH_RADIUS) continue;
                            const impulse = Math.min(speed * 0.34, 13) * (1 - dist / PUSH_RADIUS);
                            if (impulse < 0.05) continue;
                            Body.setVelocity(body, {
                                x: body.velocity.x + (dx / dist) * impulse,
                                y: body.velocity.y + (dy / dist) * impulse,
                            });
                        }
                    }
                }
                cursor.vx *= 0.55;
                cursor.vy *= 0.55;

                Engine.update(engine, dt);

                for (const body of bodies) {
                    const speed = Math.hypot(body.velocity.x, body.velocity.y);
                    if (speed > MAX_SPEED) {
                        const k = MAX_SPEED / speed;
                        Body.setVelocity(body, { x: body.velocity.x * k, y: body.velocity.y * k });
                    }
                    // Once a badge comes to rest, let it quietly turn upright so the logo stays readable.
                    if (speed < 0.7 && Math.abs(body.angularVelocity) < 0.06) {
                        const upright = Math.round(body.angle / (Math.PI * 2)) * Math.PI * 2;
                        const diff = upright - body.angle;
                        if (Math.abs(diff) > 0.002) {
                            Body.setAngle(body, body.angle + diff * 0.09);
                            Body.setAngularVelocity(body, 0);
                        }
                    }
                    // Safety net: anything that escapes the frame gets dropped back in.
                    if (
                        body.position.y > height + 400 ||
                        body.position.x < -200 ||
                        body.position.x > width + 200
                    ) {
                        Body.setPosition(body, { x: inset + r + 4 + Math.random() * span, y: -80 });
                        Body.setVelocity(body, { x: 0, y: 0 });
                    }
                }

                for (let i = 0; i < bodies.length; i += 1) {
                    const el = badgeRefs.current[i];
                    if (!el) continue;
                    const body = bodies[i];
                    el.style.transform = `translate3d(${(body.position.x - r).toFixed(2)}px, ${(body.position.y - r).toFixed(2)}px, 0)`;
                    const spinner = el.firstElementChild as HTMLElement | null;
                    if (spinner) spinner.style.transform = `rotate(${body.angle.toFixed(4)}rad)`;
                }
            };

            setReady(true);
            raf = requestAnimationFrame(frame);

            detach = () => {
                observer.disconnect();
                host.removeEventListener('pointermove', onPointerMove);
                host.removeEventListener('pointerleave', onPointerLeave);
                Composite.clear(world, false);
                Engine.clear(engine);
            };
        })();

        return () => {
            disposed = true;
            cancelAnimationFrame(raf);
            detach();
        };
    }, [epoch, regionOk]);

    return (
        <div
            ref={hostRef}
            className={`aff-badges${ready ? ' is-ready' : ''}${enabled ? ' is-live' : ''}`}
            aria-label="Affiliations"
        >
            {/* One shared caption instead of a tooltip per badge: the badges drift around, and a
                label pinned to a moving badge runs off the edge of the page. */}
            <div className={`aff-label${hovered ? ' is-on' : ''}`} aria-hidden="true">
                {hovered ?? ''}
            </div>
            {enabled && AFFILIATIONS.map((item, index) => (
                <div
                    key={item.id}
                    ref={(el) => { badgeRefs.current[index] = el; }}
                    className="aff-badge"
                    style={{ width: radius * 2, height: radius * 2 }}
                    tabIndex={0}
                    role="img"
                    aria-label={item.label}
                    onPointerEnter={() => setHovered(item.label)}
                    onPointerLeave={() => setHovered((v) => (v === item.label ? null : v))}
                    onFocus={() => setHovered(item.label)}
                    onBlur={() => setHovered((v) => (v === item.label ? null : v))}
                >
                    <div className="aff-badge-spin">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={item.src}
                            alt=""
                            aria-hidden="true"
                            draggable={false}
                            style={{ width: `${item.scale * 100}%`, height: `${item.scale * 100}%` }}
                        />
                    </div>
                </div>
            ))}
        </div>
    );
}

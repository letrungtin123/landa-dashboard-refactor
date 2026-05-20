import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from 'framer-motion';

/**
 * AnimatedBackground — Futuristic AI Globe Network
 *
 * A half-globe rising from the bottom of the screen with:
 * - SVG latitude/longitude lines
 * - Glowing network nodes
 * - Curved data arcs with animated dash
 * - Floating particles
 * - Mouse parallax
 * - Cyan/teal/blue palette on dark navy
 *
 * Dependencies: react, framer-motion (already in package.json)
 * NO new packages installed.
 */

// ─── Types ──────────────────────────────────────────────────────────────
interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  delay: number;
  duration: number;
  opacity: number;
  color: string;
}

interface GlobeNode {
  id: number;
  cx: number;
  cy: number;
  r: number;
  delay: number;
  duration: number;
}

interface NetworkArc {
  id: number;
  d: string;
  delay: number;
  duration: number;
  color: string;
  width: number;
}

// ─── Data generators (stable via useMemo) ───────────────────────────────
function generateParticles(count: number): Particle[] {
  const colors = [
    'rgba(34,211,238,0.6)',  // cyan
    'rgba(56,189,248,0.5)',  // sky
    'rgba(147,197,253,0.4)', // blue-light
    'rgba(255,255,255,0.3)', // white
  ];
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 2.5 + 0.8,
    delay: Math.random() * 12,
    duration: Math.random() * 10 + 8,
    opacity: Math.random() * 0.4 + 0.15,
    color: colors[i % colors.length],
  }));
}

function generateGlobeNodes(count: number): GlobeNode[] {
  // Distribute nodes along visible half-globe (upper hemisphere)
  return Array.from({ length: count }, (_, i) => {
    // Parametric on the globe circle
    const angle = (Math.PI * 0.15) + (Math.PI * 0.7 * i / count);
    const r = 420; // Globe radius in SVG coords
    const cx = 500 + Math.cos(angle) * r * (0.65 + Math.random() * 0.3);
    const cy = 500 - Math.sin(angle) * r * (0.3 + Math.random() * 0.55);
    return {
      id: i,
      cx: Math.round(cx),
      cy: Math.round(cy),
      r: Math.random() * 2 + 1.5,
      delay: Math.random() * 5,
      duration: Math.random() * 3 + 2,
    };
  });
}

function generateNetworkArcs(count: number): NetworkArc[] {
  const colors = [
    'rgba(34,211,238,0.4)',  // cyan
    'rgba(6,182,212,0.3)',   // teal
    'rgba(251,191,36,0.25)', // amber accent
    'rgba(56,189,248,0.35)', // sky
  ];
  return Array.from({ length: count }, (_, i) => {
    // Create curved arcs across the globe
    const startAngle = Math.PI * 0.2 + (Math.PI * 0.6 * i / count);
    const endAngle = startAngle + Math.PI * (0.2 + Math.random() * 0.4);
    const r = 420;
    const sx = 500 + Math.cos(startAngle) * r * 0.75;
    const sy = 500 - Math.sin(startAngle) * r * 0.45;
    const ex = 500 + Math.cos(endAngle) * r * 0.8;
    const ey = 500 - Math.sin(endAngle) * r * 0.5;
    // Control point for the curve — pull toward center-top
    const mx = (sx + ex) / 2 + (Math.random() - 0.5) * 120;
    const my = Math.min(sy, ey) - 80 - Math.random() * 100;

    return {
      id: i,
      d: `M ${sx} ${sy} Q ${mx} ${my} ${ex} ${ey}`,
      delay: Math.random() * 6,
      duration: Math.random() * 4 + 4,
      color: colors[i % colors.length],
      width: Math.random() * 0.8 + 0.5,
    };
  });
}

// ─── Continent outlines (simplified SVG paths) ──────────────────────────
// View centered ~50°E — wider spread showing Americas edge to East Asia edge
// cx=500, cy=500, r=430. Wider spread for visual balance.
const CONTINENT_PATHS = [
  // Americas — east coast fragment (far left of globe)
  {
    d: 'M 95 220 L 108 200 L 120 188 L 132 192 L 140 205 L 148 218 L 155 235 L 160 255 L 162 275 L 158 295 L 152 312 L 142 328 L 130 340 L 118 348 L 108 342 L 100 328 L 95 308 L 92 288 L 90 268 L 88 248 L 90 232 Z',
    name: 'americas',
  },
  // Europe mainland (shifted left)
  {
    d: 'M 215 225 L 232 212 L 255 200 L 278 192 L 298 188 L 318 184 L 340 178 L 358 172 L 375 168 L 390 172 L 405 178 L 418 185 L 428 192 L 440 182 L 452 175 L 460 180 L 458 192 L 448 202 L 438 212 L 430 220 L 425 230 L 418 236 L 410 240 L 402 235 L 394 242 L 384 250 L 374 256 L 365 252 L 355 258 L 340 262 L 325 258 L 312 255 L 298 248 L 285 240 L 272 232 L 258 228 L 240 230 L 225 233 Z',
    name: 'europe',
  },
  // UK + Ireland (shifted left)
  {
    d: 'M 252 192 L 265 180 L 278 174 L 286 178 L 282 190 L 272 198 L 260 202 Z',
    name: 'uk',
  },
  // Iceland fragment
  {
    d: 'M 205 155 L 218 148 L 228 152 L 225 162 L 215 165 L 208 160 Z',
    name: 'iceland',
  },
  // Scandinavia (shifted left)
  {
    d: 'M 355 118 L 368 105 L 380 98 L 392 104 L 398 115 L 395 130 L 388 145 L 378 158 L 368 165 L 358 155 L 352 142 L 350 130 Z',
    name: 'scandinavia',
  },
  // Africa (center-left)
  {
    d: 'M 298 278 L 315 270 L 335 265 L 355 268 L 370 274 L 385 280 L 400 285 L 415 290 L 430 295 L 445 302 L 458 310 L 468 322 L 478 338 L 485 355 L 490 372 L 492 390 L 490 408 L 485 425 L 475 440 L 462 452 L 448 460 L 432 465 L 418 462 L 405 458 L 392 450 L 382 440 L 372 428 L 365 412 L 358 396 L 350 378 L 345 362 L 338 345 L 332 328 L 325 312 L 318 298 L 308 288 Z',
    name: 'africa',
  },
  // Arabian Peninsula + Middle East (center)
  {
    d: 'M 470 295 L 488 288 L 508 284 L 528 282 L 548 286 L 565 295 L 578 306 L 588 320 L 592 336 L 588 350 L 580 362 L 568 370 L 552 374 L 536 372 L 520 365 L 508 355 L 498 342 L 490 328 L 482 312 Z',
    name: 'middleeast',
  },
  // Central Asia / Russia fragment (upper right)
  {
    d: 'M 465 165 L 490 158 L 520 152 L 555 148 L 590 152 L 620 158 L 648 165 L 670 175 L 685 188 L 690 198 L 682 205 L 668 200 L 645 192 L 618 188 L 590 185 L 560 182 L 530 180 L 500 178 L 478 175 Z',
    name: 'centralasia',
  },
  // India subcontinent (right side)
  {
    d: 'M 620 278 L 645 270 L 672 266 L 700 272 L 725 285 L 745 300 L 758 318 L 765 338 L 762 358 L 755 375 L 742 390 L 726 402 L 708 410 L 692 415 L 676 420 L 662 430 L 650 442 L 642 455 L 636 465 L 630 455 L 625 438 L 620 420 L 618 402 L 616 385 L 616 365 L 618 348 L 622 330 L 625 312 L 628 295 Z',
    name: 'india',
  },
  // Southeast Asia (far right)
  {
    d: 'M 772 318 L 790 312 L 808 318 L 818 332 L 815 348 L 805 358 L 790 362 L 778 355 L 772 342 Z',
    name: 'seasia1',
  },
  // Indonesia/Philippines fragments (far right edge)
  {
    d: 'M 825 338 L 842 332 L 855 340 L 852 355 L 840 362 L 828 356 Z',
    name: 'seasia2',
  },
  {
    d: 'M 858 350 L 872 345 L 882 355 L 878 368 L 865 372 L 858 364 Z',
    name: 'seasia3',
  },
  // East Asia — China coast + Japan (far right)
  {
    d: 'M 780 225 L 800 218 L 822 215 L 845 220 L 862 232 L 872 248 L 875 265 L 870 282 L 860 295 L 845 305 L 828 310 L 810 308 L 795 300 L 785 288 L 778 272 L 776 255 L 778 238 Z',
    name: 'eastasia',
  },
  // Japan
  {
    d: 'M 885 218 L 895 208 L 905 212 L 908 225 L 905 240 L 898 252 L 890 258 L 882 248 L 880 235 L 882 225 Z',
    name: 'japan',
  },
];

// Major city/metropolitan positions — glowing dots on the map
const CITY_LIGHTS: Array<{ cx: number; cy: number; size: number }> = [
  // Americas
  { cx: 120, cy: 235, size: 1.8 },  // New York (edge)
  { cx: 135, cy: 310, size: 1.5 },  // São Paulo (edge)
  // Europe
  { cx: 272, cy: 195, size: 2.5 },  // London
  { cx: 310, cy: 210, size: 2.2 },  // Paris
  { cx: 348, cy: 205, size: 2.0 },  // Berlin
  { cx: 375, cy: 248, size: 2.0 },  // Rome
  { cx: 395, cy: 228, size: 1.8 },  // Vienna
  { cx: 370, cy: 118, size: 1.6 },  // Stockholm
  { cx: 258, cy: 188, size: 1.5 },  // Dublin
  // Russia
  { cx: 460, cy: 172, size: 2.2 },  // Moscow
  // Middle East / Africa
  { cx: 440, cy: 298, size: 2.5 },  // Cairo
  { cx: 310, cy: 275, size: 1.8 },  // Casablanca
  { cx: 408, cy: 412, size: 1.8 },  // Lagos
  { cx: 465, cy: 445, size: 1.6 },  // Nairobi
  { cx: 555, cy: 310, size: 2.0 },  // Dubai
  { cx: 498, cy: 330, size: 1.8 },  // Riyadh
  { cx: 420, cy: 235, size: 2.0 },  // Istanbul
  // South/East Asia
  { cx: 680, cy: 360, size: 2.2 },  // Mumbai
  { cx: 725, cy: 295, size: 2.0 },  // Delhi
  { cx: 790, cy: 325, size: 1.8 },  // Bangkok
  { cx: 845, cy: 255, size: 2.0 },  // Shanghai
  { cx: 895, cy: 230, size: 1.8 },  // Tokyo
];

// ─── SVG Globe Component ────────────────────────────────────────────────
function GlobeSVG({ nodes, arcs, reducedMotion }: {
  nodes: GlobeNode[];
  arcs: NetworkArc[];
  reducedMotion: boolean;
}) {
  // Latitude lines (ellipses at different heights)
  const latitudes = useMemo(() => [
    { cy: 380, rx: 380, ry: 50, opacity: 0.08 },
    { cy: 310, rx: 340, ry: 65, opacity: 0.06 },
    { cy: 240, rx: 280, ry: 55, opacity: 0.05 },
    { cy: 180, rx: 200, ry: 40, opacity: 0.04 },
    { cy: 440, rx: 400, ry: 35, opacity: 0.07 },
  ], []);

  // Longitude lines (vertical arcs)
  const longitudes = useMemo(() => [
    'M 500 80 Q 300 300 500 520',
    'M 500 80 Q 700 300 500 520',
    'M 500 80 Q 200 250 420 520',
    'M 500 80 Q 800 250 580 520',
    'M 500 80 Q 150 200 350 520',
    'M 500 80 Q 850 200 650 520',
    'M 500 80 L 500 520',
  ], []);

  return (
    <svg
      viewBox="0 0 1000 600"
      className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[140%] max-w-[1400px] md:w-[110%] md:max-w-[1200px]"
      style={{ filter: 'drop-shadow(0 0 60px rgba(34,211,238,0.15))' }}
      preserveAspectRatio="xMidYMax meet"
    >
      <defs>
        {/* Globe gradient fill */}
        <radialGradient id="globeGrad" cx="50%" cy="35%" r="55%">
          <stop offset="0%" stopColor="rgba(34,211,238,0.12)" />
          <stop offset="35%" stopColor="rgba(8,47,73,0.10)" />
          <stop offset="70%" stopColor="rgba(2,6,23,0)" />
        </radialGradient>
        {/* Atmosphere glow */}
        <radialGradient id="atmosGrad" cx="50%" cy="40%" r="52%">
          <stop offset="0%" stopColor="transparent" />
          <stop offset="75%" stopColor="transparent" />
          <stop offset="88%" stopColor="rgba(34,211,238,0.06)" />
          <stop offset="95%" stopColor="rgba(34,211,238,0.12)" />
          <stop offset="100%" stopColor="rgba(34,211,238,0.02)" />
        </radialGradient>
        {/* Clip to show only top half of globe */}
        <clipPath id="globeClip">
          <rect x="0" y="0" width="1000" height="520" />
        </clipPath>
        {/* Clip exactly to the sphere radius */}
        <clipPath id="sphereClip">
          <circle cx="500" cy="500" r="430" />
        </clipPath>
      </defs>

      <g clipPath="url(#globeClip)">
        {/* Globe body */}
        <circle cx="500" cy="500" r="430" fill="url(#globeGrad)" />
        <circle cx="500" cy="500" r="430" fill="url(#atmosGrad)" />

        {/* Outer ring / atmosphere halo */}
        <circle
          cx="500" cy="500" r="438"
          fill="none"
          stroke="rgba(34,211,238,0.25)"
          strokeWidth="2"
        />
        <circle
          cx="500" cy="500" r="448"
          fill="none"
          stroke="rgba(34,211,238,0.08)"
          strokeWidth="1"
        />
        <circle
          cx="500" cy="500" r="458"
          fill="none"
          stroke="rgba(34,211,238,0.03)"
          strokeWidth="0.5"
        />

        {/* Inner sphere content wrapped in sphereClip to prevent floating edges */}
        <g clipPath="url(#sphereClip)">
          {/* ── Continent outlines (Earth map) ── */}
        {CONTINENT_PATHS.map((cont) => (
          <g key={cont.name}>
            {/* Filled land mass */}
            <path
              d={cont.d}
              fill="rgba(34,211,238,0.12)"
              stroke="rgba(34,211,238,0.4)"
              strokeWidth="0.8"
            />
            {/* Coastline outline */}
            <path
              d={cont.d}
              fill="none"
              stroke="rgba(34,211,238,0.5)"
              strokeWidth="0.4"
              strokeDasharray="3 2"
            />
          </g>
        ))}

        {/* ── City lights ── */}
        {CITY_LIGHTS.map((city, i) => (
          <g key={`city-${i}`}>
            {/* SVG vector glow (outer circle with low opacity) */}
            <circle
              cx={city.cx} cy={city.cy} r={city.size * 2.5}
              fill="rgba(34,211,238,0.15)"
            />
            <circle
              cx={city.cx} cy={city.cy} r={city.size}
              fill="rgba(34,211,238,0.9)"
            />
            {/* Warm amber accent for select cities */}
            {i % 4 === 0 && (
              <circle
                cx={city.cx} cy={city.cy} r={city.size * 0.6}
                fill="rgba(251,191,36,0.7)"
              />
            )}
          </g>
        ))}

        {/* Latitude lines (subtle, behind continents) */}
        {latitudes.map((lat, i) => (
          <ellipse
            key={`lat-${i}`}
            cx="500"
            cy={lat.cy}
            rx={lat.rx}
            ry={lat.ry}
            fill="none"
            stroke="rgba(34,211,238,0.4)"
            strokeWidth="0.4"
            opacity={lat.opacity}
            strokeDasharray="4 6"
          />
        ))}

        {/* Longitude lines */}
        {longitudes.map((d, i) => (
          <path
            key={`lon-${i}`}
            d={d}
            fill="none"
            stroke="rgba(34,211,238,0.3)"
            strokeWidth="0.3"
            opacity={0.06 + (i % 3) * 0.02}
            strokeDasharray="3 5"
          />
        ))}

        {/* Network arcs */}
        {arcs.map((arc) => (
          <motion.path
            key={`arc-${arc.id}`}
            d={arc.d}
            fill="none"
            stroke={arc.color}
            strokeWidth={arc.width}
            strokeLinecap="round"
            strokeDasharray="12 8"
            initial={{ strokeDashoffset: 40, opacity: 0 }}
            animate={reducedMotion ? { opacity: 0.3 } : {
              strokeDashoffset: [40, 0, -40],
              opacity: [0, 0.6, 0],
            }}
            transition={{
              duration: arc.duration,
              repeat: Infinity,
              delay: arc.delay,
              ease: 'easeInOut',
            }}
          />
        ))}

        {/* Network nodes */}
        {nodes.map((node) => (
          <motion.circle
            key={`node-${node.id}`}
            cx={node.cx}
            cy={node.cy}
            r={node.r}
            fill="rgba(34,211,238,0.8)"
            initial={{ scale: 1, opacity: 0.3 }}
            animate={reducedMotion ? { opacity: 0.5 } : {
              scale: [1, 1.8, 1],
              opacity: [0.3, 0.9, 0.3],
            }}
            transition={{
              duration: node.duration,
              repeat: Infinity,
              delay: node.delay,
              ease: 'easeInOut',
            }}
          />
        ))}

        {/* Extra bright hub nodes at major cities */}
        {[
          { cx: 272, cy: 195 },  // London
          { cx: 440, cy: 298 },  // Cairo
          { cx: 460, cy: 172 },  // Moscow
          { cx: 680, cy: 360 },  // Mumbai
          { cx: 555, cy: 310 },  // Dubai
          { cx: 845, cy: 255 },  // Shanghai
          { cx: 120, cy: 235 },  // New York
        ].map((p, i) => (
          <g key={`bright-${i}`}>
            {/* Static outer glow for hub node (cheap rendering) */}
            <circle
              cx={p.cx} cy={p.cy} r="6"
              fill="rgba(34,211,238,0.3)"
            />
            <motion.circle
              cx={p.cx} cy={p.cy} r="3"
              fill="rgba(34,211,238,1)"
              animate={reducedMotion ? {} : {
                r: [3, 5, 3],
                opacity: [0.6, 1, 0.6],
              }}
              transition={{
                duration: 3 + i * 0.5,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: i * 0.8,
              }}
            />
            {/* Glow ring around hub nodes */}
            <motion.circle
              cx={p.cx} cy={p.cy} r="10"
              fill="none"
              stroke="rgba(34,211,238,0.25)"
              strokeWidth="0.6"
              animate={reducedMotion ? {} : {
                r: [10, 16, 10],
                opacity: [0.25, 0.08, 0.25],
              }}
              transition={{
                duration: 4 + i * 0.3,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: i * 0.5,
              }}
            />
          </g>
        ))}
        </g>
      </g>
    </svg>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────
export function AnimatedBackground() {
  const [mounted, setMounted] = useState(false);
  const reducedMotion = false; // Forced to false to ensure animations run on all Chrome profiles
  const containerRef = useRef<HTMLDivElement>(null);

  // Mouse parallax
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springConfig = { stiffness: 30, damping: 25, mass: 1 };
  const springX = useSpring(mouseX, springConfig);
  const springY = useSpring(mouseY, springConfig);

  const globeX = useTransform(springX, [-1, 1], [-20, 20]);
  const globeY = useTransform(springY, [-1, 1], [-15, 15]);
  const particleX = useTransform(springX, [-1, 1], [15, -15]);
  const particleY = useTransform(springY, [-1, 1], [10, -10]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const x = (e.clientX / window.innerWidth) * 2 - 1;
    const y = (e.clientY / window.innerHeight) * 2 - 1;
    mouseX.set(x);
    mouseY.set(y);
  }, [mouseX, mouseY]);

  useEffect(() => {
    setMounted(true);
    if (reducedMotion) return;
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [reducedMotion, handleMouseMove]);

  // Stable data
  const particles = useMemo(() => generateParticles(45), []);
  const globeNodes = useMemo(() => generateGlobeNodes(18), []);
  const networkArcs = useMemo(() => generateNetworkArcs(8), []);

  if (!mounted) {
    return <div className="fixed inset-0 pointer-events-none -z-10 bg-[#020617]" />;
  }

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 overflow-hidden pointer-events-none -z-10"
      style={{
        background: 'linear-gradient(180deg, #020617 0%, #061826 40%, #082f49 80%, #0c4a6e 100%)',
      }}
    >
      {/* ─── CSS Keyframes for GPU-accelerated ribbons ─── */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes flowRibbon1 {
          0% { transform: translate3d(-500px, 0, 0) skewX(-20deg); }
          100% { transform: translate3d(105vw, 0, 0) skewX(-20deg); }
        }
        @keyframes flowRibbon2 {
          0% { transform: translate3d(-700px, 0, 0) skewX(-15deg); }
          100% { transform: translate3d(105vw, 0, 0) skewX(-15deg); }
        }
        @keyframes flowRibbon3 {
          0% { transform: translate3d(-900px, 0, 0) skewX(-25deg); }
          100% { transform: translate3d(105vw, 0, 0) skewX(-25deg); }
        }
      `}} />

      {/* ─── Layer 0: Flowing Ribbons (Left to Right) ─── */}
      {!reducedMotion && (
        <div className="absolute inset-0 z-0 overflow-hidden opacity-40 mix-blend-screen">
          {/* Ribbon 1: Fast & Thin, cyan */}
          <div
            className="absolute top-[25%] left-0 w-[400px] h-[3px] blur-[2px]"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(34,211,238,0) 10%, rgba(34,211,238,0.7) 50%, rgba(34,211,238,0) 90%, transparent)',
              animation: 'flowRibbon1 14s linear infinite',
            }}
          />
          {/* Ribbon 2: Medium speed, blue, slightly lower */}
          <div
            className="absolute top-[48%] left-0 w-[600px] h-[5px] blur-[4px]"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(37,99,235,0) 10%, rgba(34,211,238,0.4) 50%, rgba(37,99,235,0) 90%, transparent)',
              animation: 'flowRibbon2 18s linear infinite',
              animationDelay: '3s',
            }}
          />
          {/* Ribbon 3: Slow & Broad, bottom region */}
          <div
            className="absolute top-[72%] left-0 w-[800px] h-[8px] blur-[6px]"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(6,182,212,0) 10%, rgba(34,211,238,0.3) 50%, rgba(6,182,212,0) 90%, transparent)',
              animation: 'flowRibbon3 24s linear infinite',
              animationDelay: '1s',
            }}
          />
          {/* Ribbon 4: Very fast highlight */}
          <div
            className="absolute top-[15%] left-0 w-[350px] h-[2px] blur-[1px]"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(34,211,238,0.8) 50%, transparent)',
              animation: 'flowRibbon1 9s linear infinite',
              animationDelay: '5s',
            }}
          />
        </div>
      )}

      {/* ═══ Layer 0: Subtle grid ═══ */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(34,211,238,0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(34,211,238,0.3) 1px, transparent 1px)
          `,
          backgroundSize: '80px 80px',
          maskImage: 'radial-gradient(ellipse 60% 50% at 50% 70%, #000 0%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 60% 50% at 50% 70%, #000 0%, transparent 100%)',
        }}
      />

      {/* ═══ Layer 1: Ambient glow orbs ═══ */}
      <div
        className="absolute bottom-[-20%] left-[30%] w-[60vw] h-[60vw] max-w-[800px] max-h-[800px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(34,211,238,0.12) 0%, rgba(8,47,73,0.06) 40%, transparent 65%)',
        }}
      />
      <div
        className="absolute bottom-[-10%] right-[10%] w-[40vw] h-[40vw] max-w-[500px] max-h-[500px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(6,182,212,0.08) 0%, transparent 60%)',
        }}
      />
      <div
        className="absolute top-[5%] left-[15%] w-[30vw] h-[30vw] max-w-[400px] max-h-[400px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(37,99,235,0.06) 0%, transparent 55%)',
        }}
      />

      {/* ═══ Layer 2: Globe with parallax ═══ */}
      <motion.div
        className="absolute inset-0"
        style={reducedMotion ? {} : { x: globeX, y: globeY }}
      >
        {/* Outer halo rings */}
        <motion.div
          className="absolute bottom-[-40%] left-1/2 -translate-x-1/2 md:bottom-[-45%]"
          animate={reducedMotion ? {} : { rotate: [0, 360] }}
          transition={{ duration: 120, repeat: Infinity, ease: 'linear' }}
        >
          <div
            className="w-[110vw] h-[110vw] max-w-[1300px] max-h-[1300px] md:w-[90vw] md:h-[90vw] rounded-full"
            style={{
              border: '1px solid rgba(34,211,238,0.06)',
              boxShadow: '0 0 80px 20px rgba(34,211,238,0.03), inset 0 0 80px 20px rgba(34,211,238,0.02)',
            }}
          />
        </motion.div>

        {/* The SVG globe */}
        <motion.div
          className="absolute bottom-[-22%] left-0 right-0 md:bottom-[-28%]"
          animate={reducedMotion ? {} : {
            y: [0, -8, 0],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
        >
          <GlobeSVG
            nodes={globeNodes}
            arcs={networkArcs}
            reducedMotion={reducedMotion}
          />
        </motion.div>

        {/* Bright center glow at horizon */}
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[80%] h-[200px] md:h-[300px]"
          style={{
            background: 'radial-gradient(ellipse 50% 100% at 50% 100%, rgba(34,211,238,0.15) 0%, transparent 70%)',
          }}
        />
      </motion.div>

      {/* ═══ Layer 3: Floating particles with parallax ═══ */}
      <motion.div
        className="absolute inset-0"
        style={reducedMotion ? {} : { x: particleX, y: particleY }}
      >
        {particles.map((p) => (
          <motion.div
            key={p.id}
            className="absolute rounded-full"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
            }}
            animate={reducedMotion ? { opacity: p.opacity * 0.5 } : {
              y: [0, -30, 0],
              x: [0, (p.id % 2 === 0 ? 8 : -8), 0],
              opacity: [p.opacity * 0.3, p.opacity, p.opacity * 0.3],
              scale: [1, 1.3, 1],
            }}
            transition={{
              duration: p.duration,
              repeat: Infinity,
              delay: p.delay,
              ease: 'easeInOut',
            }}
          />
        ))}
      </motion.div>

      {/* ═══ Layer 4: Film grain ═══ */}
      <div
        className="absolute inset-0 opacity-[0.025] pointer-events-none z-[5]"
        style={{
          backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22n%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%224%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22/%3E%3C/svg%3E")',
        }}
      />

      {/* ═══ Layer 5: Vignette ═══ */}
      <div
        className="absolute inset-0 pointer-events-none z-[6]"
        style={{
          background: 'radial-gradient(ellipse 75% 70% at 50% 50%, transparent 20%, rgba(2,6,23,0.65) 100%)',
        }}
      />

      {/* ═══ Layer 6: Top edge line ═══ */}
      <div
        className="absolute top-0 left-[15%] w-[70%] h-[1px] pointer-events-none z-[7]"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(34,211,238,0.3), rgba(6,182,212,0.2), transparent)',
          boxShadow: '0 0 15px 1px rgba(34,211,238,0.08)',
        }}
      />
    </div>
  );
}

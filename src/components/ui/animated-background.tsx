import { useEffect, useState, useMemo, useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

// ── SVG Morphing Blob (organic, breathing shape) ──
function MorphBlob({ color, size, x, y, delay, duration }: {
  color: string; size: number; x: string; y: string; delay: number; duration: number;
}) {
  const paths = [
    'M60,20 C80,0 100,20 95,45 C90,70 75,85 55,88 C35,91 10,80 5,55 C0,30 40,40 60,20Z',
    'M55,15 C78,5 98,28 90,52 C82,76 62,90 40,85 C18,80 2,60 8,38 C14,16 32,25 55,15Z',
    'M65,18 C85,8 102,35 94,58 C86,81 65,88 42,82 C19,76 4,55 12,33 C20,11 45,28 65,18Z',
    'M50,12 C75,2 100,25 96,50 C92,75 72,92 48,88 C24,84 2,65 6,40 C10,15 25,22 50,12Z',
    'M62,22 C82,4 100,30 93,55 C86,80 66,88 44,84 C22,80 5,60 10,36 C15,12 42,40 62,22Z',
  ];

  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{ left: x, top: y, width: size, height: size }}
      animate={{ scale: [1, 1.12, 0.95, 1.08, 1], rotate: [0, 15, -8, 10, 0] }}
      transition={{ duration: duration * 1.5, repeat: Infinity, ease: 'easeInOut', delay }}
    >
      <svg viewBox="0 0 100 100" width={size} height={size}>
        <defs>
          <radialGradient id={`blobGrad-${delay}`} cx="40%" cy="35%" r="60%">
            <stop offset="0%" stopColor={color} stopOpacity="0.6" />
            <stop offset="60%" stopColor={color} stopOpacity="0.15" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </radialGradient>
          <filter id={`blobBlur-${delay}`}>
            <feGaussianBlur stdDeviation="2" />
          </filter>
        </defs>
        <motion.path
          fill={`url(#blobGrad-${delay})`}
          filter={`url(#blobBlur-${delay})`}
          animate={{ d: paths }}
          transition={{ duration, repeat: Infinity, ease: 'easeInOut', delay, repeatType: 'mirror' }}
        />
      </svg>
    </motion.div>
  );
}

// ── Orbiting Ring System (3D perspective rings) ──
function OrbitRings({ cx, cy, color }: { cx: string; cy: string; color: string }) {
  return (
    <div className="absolute" style={{ left: cx, top: cy, transform: 'translate(-50%, -50%)' }}>
      {[80, 130, 180].map((r, i) => (
        <motion.div
          key={r}
          className="absolute rounded-full border"
          style={{
            width: r * 2,
            height: r * 2,
            left: -r,
            top: -r,
            borderColor: color,
            borderWidth: 1,
            opacity: 0.12 - i * 0.03,
          }}
          animate={{ rotateX: [60, 60], rotateY: [0, 360] }}
          transition={{
            duration: 8 + i * 4,
            repeat: Infinity,
            ease: 'linear',
            delay: i * 0.8,
          }}
        />
      ))}
      {/* Core glow dot */}
      <motion.div
        className="absolute rounded-full"
        style={{ width: 6, height: 6, left: -3, top: -3, background: color }}
        animate={{ scale: [1, 1.8, 1], opacity: [0.8, 0.3, 0.8] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );
}

// ── Floating Geometric Shapes (enhanced with glow) ──
function FloatingShape({
  shape, size, x, y, delay, duration, color, opacity,
}: {
  shape: 'cube' | 'ring' | 'sphere' | 'triangle' | 'diamond';
  size: number; x: string; y: string; delay: number; duration: number; color: string; opacity: number;
}) {
  const style = { left: x, top: y };

  if (shape === 'diamond') {
    return (
      <motion.div
        className="absolute transform-gpu"
        style={style}
        animate={{ rotate: [0, 180, 360], y: ['0%', '-30%', '0%'], scale: [1, 1.1, 1] }}
        transition={{ duration, repeat: Infinity, ease: 'easeInOut', delay }}
      >
        <div style={{
          width: size, height: size,
          background: `linear-gradient(135deg, ${color}50, ${color}10)`,
          transform: 'rotate(45deg)',
          borderRadius: 4,
          border: `1px solid ${color}`,
          opacity,
          boxShadow: `0 0 ${size}px ${color}40, inset 0 0 ${size * 0.4}px ${color}20`,
        }} />
      </motion.div>
    );
  }

  if (shape === 'cube') {
    return (
      <motion.div
        className="absolute transform-gpu"
        style={{ ...style, perspective: '800px' }}
        animate={{ rotateX: [0, 360], rotateY: [0, 180], y: ['0%', '-28%', '0%'] }}
        transition={{ duration, repeat: Infinity, ease: 'easeInOut', delay }}
      >
        <div className="border rounded-lg" style={{
          width: size, height: size,
          borderColor: color,
          borderWidth: 1.5,
          opacity: opacity * 1.8,
          boxShadow: `0 0 ${size}px ${color}, 0 0 ${size * 2}px ${color}40, inset 0 0 ${size * 0.5}px ${color}80`,
          background: `linear-gradient(135deg, ${color}25 0%, ${color}08 40%, transparent 70%)`,
        }} />
      </motion.div>
    );
  }

  if (shape === 'ring') {
    return (
      <motion.div
        className="absolute transform-gpu"
        style={style}
        animate={{ rotateX: [45, 405], rotateY: [0, 360], y: ['0%', '-25%', '0%'] }}
        transition={{ duration: duration * 1.2, repeat: Infinity, ease: 'easeInOut', delay }}
      >
        <div className="rounded-full" style={{
          width: size, height: size,
          border: `2px solid ${color}`,
          opacity: opacity * 1.8,
          boxShadow: `0 0 ${size * 0.8}px ${color}, 0 0 ${size * 1.5}px ${color}40`,
        }} />
      </motion.div>
    );
  }

  if (shape === 'triangle') {
    return (
      <motion.div
        className="absolute transform-gpu"
        style={style}
        animate={{ rotate: [0, 360], y: ['0%', '-35%', '0%'], scale: [1, 1.1, 1] }}
        transition={{ duration, repeat: Infinity, ease: 'easeInOut', delay }}
      >
        <div style={{
          width: 0, height: 0,
          borderLeft: `${size / 2}px solid transparent`,
          borderRight: `${size / 2}px solid transparent`,
          borderBottom: `${size}px solid ${color}`,
          opacity,
          filter: `drop-shadow(0 0 ${size * 0.6}px ${color}) drop-shadow(0 0 ${size}px ${color}40)`,
        }} />
      </motion.div>
    );
  }

  // sphere
  return (
    <motion.div
      className="absolute transform-gpu"
      style={style}
      animate={{ y: ['0%', '-40%', '0%'], x: ['-5%', '5%', '-5%'], scale: [1, 1.15, 1] }}
      transition={{ duration, repeat: Infinity, ease: 'easeInOut', delay }}
    >
      <div className="rounded-full" style={{
        width: size, height: size,
        background: `radial-gradient(circle at 35% 35%, ${color}60, ${color}20 45%, transparent 65%)`,
        opacity: opacity * 1.5,
        boxShadow: `0 0 ${size}px ${color}40, 0 0 ${size * 2}px ${color}15`,
      }} />
    </motion.div>
  );
}

// ── Depth Particles (near=large/blurry, far=small/sharp) ──
function DepthParticles({ count = 40 }: { count?: number }) {
  const particles = useMemo(() =>
    Array.from({ length: count }, (_, i) => {
      const depth = Math.random(); // 0=near, 1=far
      return {
        id: i,
        x: `${Math.random() * 100}%`,
        size: depth < 0.3 ? Math.random() * 4 + 3 : Math.random() * 2 + 0.5,
        blur: depth < 0.3 ? Math.random() * 3 + 1 : 0,
        delay: Math.random() * 10,
        duration: Math.random() * 8 + 6,
        opacity: depth < 0.3 ? Math.random() * 0.25 + 0.05 : Math.random() * 0.5 + 0.15,
        color: i % 3 === 0 ? 'rgba(249,115,22,' : i % 3 === 1 ? 'rgba(6,182,212,' : 'rgba(139,92,246,',
      };
    }),
  [count]);

  return (
    <>
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full transform-gpu"
          style={{
            left: p.x,
            bottom: '-5%',
            width: p.size,
            height: p.size,
            background: `${p.color}1)`,
            filter: p.blur > 0 ? `blur(${p.blur}px)` : undefined,
            opacity: 0,
          }}
          animate={{
            y: [0, -(typeof window !== 'undefined' ? window.innerHeight : 800) * 1.2],
            opacity: [0, p.opacity, p.opacity * 0.8, 0],
            x: [0, (Math.random() - 0.5) * 60, 0],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: 'linear',
          }}
        />
      ))}
    </>
  );
}

// ── Chromatic Aberration Light Sweep ──
function ChromaticSweep() {
  return (
    <>
      {/* Red channel */}
      <motion.div
        className="absolute top-0 left-0 w-[200%] h-full pointer-events-none"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(255,50,50,0.04) 10%, transparent 20%)',
          mixBlendMode: 'screen',
        }}
        animate={{ x: ['-100%', '100%'] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', repeatDelay: 5 }}
      />
      {/* Blue channel (offset) */}
      <motion.div
        className="absolute top-0 left-0 w-[200%] h-full pointer-events-none"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(50,100,255,0.04) 10%, transparent 20%)',
          mixBlendMode: 'screen',
        }}
        animate={{ x: ['-110%', '90%'] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', repeatDelay: 5 }}
      />
      {/* White core */}
      <motion.div
        className="absolute top-0 left-0 w-[200%] h-full pointer-events-none opacity-[0.025]"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, white 10%, transparent 20%)',
        }}
        animate={{ x: ['-105%', '95%'] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', repeatDelay: 5 }}
      />
    </>
  );
}

// ── Scanline texture (CRT-style subtle overlay) ──
function Scanlines() {
  return (
    <div
      className="absolute inset-0 pointer-events-none z-[5] opacity-[0.025]"
      style={{
        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)',
      }}
    />
  );
}

// ── Main ──
export function AnimatedBackground() {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const [mounted, setMounted] = useState(false);
  const rafRef = useRef<number | null>(null);

  const springConfig = { stiffness: 25, damping: 22, mass: 1.2 };
  const springX = useSpring(mouseX, springConfig);
  const springY = useSpring(mouseY, springConfig);

  useEffect(() => {
    setMounted(true);
    const handleMouseMove = (e: MouseEvent) => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const x = (e.clientX / window.innerWidth) * 2 - 1;
        const y = (e.clientY / window.innerHeight) * 2 - 1;
        mouseX.set(x);
        mouseY.set(y);
      });
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [mouseX, mouseY]);

  // Parallax layers — 3 độ sâu
  const bgX  = useTransform(springX, [-1, 1], [-50, 50]);
  const bgY  = useTransform(springY, [-1, 1], [-50, 50]);
  const midX = useTransform(springX, [-1, 1], [35, -35]);
  const midY = useTransform(springY, [-1, 1], [35, -35]);
  const fgX  = useTransform(springX, [-1, 1], [70, -70]);
  const fgY  = useTransform(springY, [-1, 1], [70, -70]);

  // Grid rotation (3D tilt)
  const gridRotX = useTransform(springY, [-1, 1], ['18deg', '-18deg']);
  const gridRotY = useTransform(springX, [-1, 1], ['-18deg', '18deg']);

  // Subtle camera tilt on the whole scene
  const sceneRotX = useTransform(springY, [-1, 1], ['2deg', '-2deg']);
  const sceneRotY = useTransform(springX, [-1, 1], ['-3deg', '3deg']);

  if (!mounted) return <div className="fixed inset-0 pointer-events-none -z-10 bg-[#050810]" />;

  return (
    <motion.div
      className="fixed inset-0 overflow-hidden pointer-events-none -z-10 bg-[#050810]"
      style={{ perspective: '1400px', rotateX: sceneRotX, rotateY: sceneRotY }}
    >
      {/* ── Layer 0: Deep perspective grid ── */}
      <motion.div
        style={{ rotateX: gridRotX, rotateY: gridRotY, z: -500 }}
        className="absolute inset-[-100%] transform-gpu"
      >
        {/* Primary grid */}
        <div className="w-full h-full" style={{
          backgroundImage: `
            linear-gradient(rgba(37,99,235,0.4) 1px, transparent 1px),
            linear-gradient(90deg, rgba(6,182,212,0.4) 1px, transparent 1px)
          `,
          backgroundSize: '55px 55px',
          opacity: 0.09,
          maskImage: 'radial-gradient(ellipse 65% 55% at 50% 50%, #000 0%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 65% 55% at 50% 50%, #000 0%, transparent 100%)',
        }} />
        {/* Secondary fine grid */}
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(rgba(79,70,229,0.22) 1px, transparent 1px),
            linear-gradient(90deg, rgba(79,70,229,0.22) 1px, transparent 1px)
          `,
          backgroundSize: '11px 11px',
          opacity: 0.06,
          maskImage: 'radial-gradient(ellipse 40% 35% at 50% 50%, #000 0%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 40% 35% at 50% 50%, #000 0%, transparent 100%)',
        }} />
      </motion.div>

      {/* ── Layer 1: Aurora backdrop — morphing, slow ── */}
      <motion.div style={{ x: bgX, y: bgY }} className="absolute inset-0 z-[-4]">
        {/* Primary blue glow — top-left */}
        <motion.div
          animate={{ scale: [1, 1.35, 1], rotate: [0, 360] }}
          transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-[30%] -left-[15%] w-[65vw] h-[65vw] max-w-[850px] max-h-[850px] transform-gpu"
          style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.22) 0%, rgba(37,99,235,0.07) 40%, transparent 60%)' }}
        />
        {/* Cyan aurora — bottom-right */}
        <motion.div
          animate={{ scale: [1.2, 0.85, 1.2], rotate: [0, -360] }}
          transition={{ duration: 26, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -bottom-[35%] -right-[15%] w-[75vw] h-[75vw] max-w-[950px] max-h-[950px] transform-gpu"
          style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.2) 0%, rgba(6,182,212,0.06) 40%, transparent 60%)' }}
        />
        {/* Indigo accent — mid */}
        <motion.div
          animate={{ scale: [1, 1.25, 1], opacity: [0.12, 0.22, 0.12] }}
          transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
          className="absolute top-[15%] left-[25%] w-[55vw] h-[55vw] max-w-[650px] max-h-[650px] transform-gpu"
          style={{ background: 'radial-gradient(circle, rgba(79,70,229,0.14) 0%, transparent 55%)' }}
        />
        {/* Sky blue center ambient */}
        <motion.div
          animate={{ scale: [1, 1.18, 1], opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 5 }}
          className="absolute top-[30%] left-[35%] w-[40vw] h-[40vw] max-w-[500px] max-h-[500px] transform-gpu"
          style={{ background: 'radial-gradient(circle, rgba(14,165,233,0.14) 0%, transparent 55%)' }}
        />
      </motion.div>

      {/* ── Layer 2: Morphing SVG blobs ── */}
      <motion.div style={{ x: bgX, y: bgY }} className="absolute inset-0 z-[-3]">
        <MorphBlob color="#2563eb" size={320} x="-5%" y="-10%" delay={0} duration={12} />
        <MorphBlob color="#06b6d4" size={280} x="65%" y="55%" delay={2} duration={16} />
        <MorphBlob color="#4f46e5" size={220} x="75%" y="-15%" delay={4} duration={14} />
        <MorphBlob color="#0ea5e9" size={180} x="10%" y="60%" delay={1} duration={11} />
      </motion.div>

      {/* ── Layer 3: Orbit rings (midground) ── */}
      <motion.div style={{ x: midX, y: midY, perspective: '800px' }} className="absolute inset-0 z-[-2]">
        <OrbitRings cx="15%" cy="25%" color="rgba(37,99,235,0.9)" />
        <OrbitRings cx="82%" cy="70%" color="rgba(6,182,212,0.9)" />
        <OrbitRings cx="55%" cy="88%" color="rgba(79,70,229,0.7)" />
      </motion.div>

      {/* ── Layer 4: Floating geometric shapes ── */}
      <motion.div style={{ x: midX, y: midY }} className="absolute inset-0 z-[-2]">
        <FloatingShape shape="cube"     size={50} x="10%" y="15%"  delay={0}   duration={14} color="rgba(37,99,235,0.7)"   opacity={0.35} />
        <FloatingShape shape="ring"     size={70} x="76%" y="20%"  delay={2}   duration={18} color="rgba(6,182,212,0.7)"   opacity={0.3}  />
        <FloatingShape shape="diamond"  size={38} x="60%" y="62%"  delay={1}   duration={12} color="rgba(37,99,235,0.6)"   opacity={0.4}  />
        <FloatingShape shape="triangle" size={36} x="22%" y="70%"  delay={3}   duration={16} color="rgba(6,182,212,0.6)"   opacity={0.28} />
        <FloatingShape shape="cube"     size={28} x="84%" y="52%"  delay={4}   duration={20} color="rgba(79,70,229,0.6)"   opacity={0.25} />
        <FloatingShape shape="ring"     size={46} x="40%" y="8%"   delay={1.5} duration={15} color="rgba(14,165,233,0.5)"  opacity={0.2}  />
        <FloatingShape shape="sphere"   size={58} x="28%" y="45%"  delay={2.5} duration={13} color="rgba(6,182,212,0.5)"   opacity={0.3}  />
        <FloatingShape shape="diamond"  size={44} x="88%" y="8%"   delay={0.8} duration={17} color="rgba(79,70,229,0.5)"   opacity={0.22} />
        <FloatingShape shape="sphere"   size={32} x="50%" y="80%"  delay={3.5} duration={11} color="rgba(37,99,235,0.4)"   opacity={0.25} />
      </motion.div>

      {/* ── Layer 5: Foreground vivid orbs ── */}
      <motion.div style={{ x: fgX, y: fgY }} className="absolute inset-0 z-[-1]">
        {/* Blue foreground orb — top-right */}
        <motion.div
          animate={{ y: ['0%', '-25%', '0%'], x: ['0%', '15%', '0%'], scale: [1, 1.18, 1] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-[8%] right-[18%] w-[26vw] h-[26vw] max-w-[320px] max-h-[320px] transform-gpu"
          style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.26) 0%, rgba(37,99,235,0.07) 50%, transparent 70%)' }}
        />
        {/* Cyan foreground orb — bottom-left */}
        <motion.div
          animate={{ y: ['0%', '28%', '0%'], x: ['0%', '-18%', '0%'], scale: [1.1, 0.9, 1.1] }}
          transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          className="absolute bottom-[18%] left-[8%] w-[30vw] h-[30vw] max-w-[380px] max-h-[380px] transform-gpu"
          style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.22) 0%, rgba(6,182,212,0.06) 50%, transparent 70%)' }}
        />
        {/* Indigo center accent */}
        <motion.div
          animate={{ y: ['0%', '35%', '0%'], x: ['-8%', '8%', '-8%'], scale: [1, 1.25, 1] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          className="absolute top-[38%] left-[43%] w-[14vw] h-[14vw] max-w-[170px] max-h-[170px] transform-gpu"
          style={{ background: 'radial-gradient(circle, rgba(79,70,229,0.2) 0%, transparent 60%)' }}
        />
      </motion.div>

      {/* ── Layer 6: Depth particles ── */}
      <DepthParticles count={35} />

      {/* ── Layer 7: Chromatic aberration sweep ── */}
      <ChromaticSweep />

      {/* ── Scanlines ── */}
      <Scanlines />

      {/* ── Film grain noise ── */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none z-[6]"
        style={{
          backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22n%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%224%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22/%3E%3C/svg%3E")',
        }}
      />

      {/* ── Vignette ── */}
      <div
        className="absolute inset-0 pointer-events-none z-[7]"
        style={{ background: 'radial-gradient(ellipse 85% 85% at 50% 50%, transparent 25%, rgba(5,8,16,0.55) 100%)' }}
      />

      {/* ── Edge glow streaks ── */}
      <div
        className="absolute top-0 left-0 w-[50%] h-[1px] pointer-events-none z-[8] opacity-25"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(37,99,235,0.9), transparent)' }}
      />
      <div
        className="absolute top-0 right-0 w-[50%] h-[1px] pointer-events-none z-[8] opacity-20"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(6,182,212,0.9), transparent)' }}
      />
    </motion.div>
  );
}

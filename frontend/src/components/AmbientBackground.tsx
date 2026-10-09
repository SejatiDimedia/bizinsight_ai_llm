import React from 'react';

export const AmbientBackground: React.FC = () => {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden select-none">
      {/* Base deep obsidian/slate canvas */}
      <div className="absolute inset-0 bg-[#090b11]" />

      {/* Luminous Frosted Light Orb 1: Upper Right Silvery Moonlight wash */}
      <div
        className="absolute -top-[12%] -right-[8%] h-[780px] w-[880px] rounded-full bg-gradient-to-br from-slate-200/25 via-slate-400/12 to-transparent blur-[140px]"
        style={{ transform: 'translate3d(0, 0, 0)' }}
      />

      {/* Luminous Frosted Light Orb 2: Center-Left Smoky Platinum / Titanium wash */}
      <div
        className="absolute top-[26%] -left-[10%] h-[700px] w-[780px] rounded-full bg-gradient-to-tr from-slate-300/22 via-zinc-400/12 to-transparent blur-[150px]"
        style={{ transform: 'translate3d(0, 0, 0)' }}
      />

      {/* Luminous Frosted Light Orb 3: Central Radiance directly behind main prompt & greeting */}
      <div
        className="absolute top-[16%] left-[22%] h-[500px] w-[660px] rounded-full bg-white/[0.12] blur-[120px]"
        style={{ transform: 'translate3d(0, 0, 0)' }}
      />

      {/* Luminous Frosted Light Orb 4: Bottom Right/Center Pearl Mist */}
      <div
        className="absolute -bottom-[12%] right-[8%] h-[680px] w-[780px] rounded-full bg-gradient-to-t from-slate-200/18 via-slate-400/08 to-transparent blur-[140px]"
        style={{ transform: 'translate3d(0, 0, 0)' }}
      />

      {/* Micro-Grain Frosted Glass Texture (eliminates digital banding, creates authentic tactile frosted glass) */}
      <div
        className="absolute inset-0 opacity-[0.035] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
};

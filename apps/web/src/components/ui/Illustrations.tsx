import React from 'react';

/**
 * Modern SVG vector illustrations designed specifically for AttendWise AI.
 */

export function RobotAnalystIllustration({ className = 'w-48 h-48' }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="aiHeadGrad" x1="60" y1="40" x2="180" y2="160" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6366F1" />
          <stop offset="1" stopColor="#4F46E5" />
        </linearGradient>
        <linearGradient id="aiFaceGrad" x1="80" y1="65" x2="160" y2="135" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1E1B4B" />
          <stop offset="1" stopColor="#0F172A" />
        </linearGradient>
        <linearGradient id="glowPulse" x1="0" y1="0" x2="240" y2="240" gradientUnits="userSpaceOnUse">
          <stop stopColor="#38BDF8" stopOpacity="0.4" />
          <stop offset="1" stopColor="#818CF8" stopOpacity="0.05" />
        </linearGradient>
      </defs>

      {/* Background Soft Glow Aura */}
      <circle cx="120" cy="120" r="95" fill="url(#glowPulse)" />
      
      {/* Decorative Floating Nodes */}
      <circle cx="45" cy="70" r="6" fill="#38BDF8" opacity="0.8" />
      <circle cx="195" cy="65" r="5" fill="#818CF8" opacity="0.7" />
      <circle cx="35" cy="160" r="4" fill="#34D399" opacity="0.6" />
      <circle cx="205" cy="155" r="7" fill="#F472B6" opacity="0.8" />
      <line x1="45" y1="70" x2="75" y2="85" stroke="#38BDF8" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.5" />
      <line x1="195" y1="65" x2="165" y2="85" stroke="#818CF8" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.5" />

      {/* Robot Antenna */}
      <path d="M120 45 L120 28" stroke="#6366F1" strokeWidth="4" strokeLinecap="round" />
      <circle cx="120" cy="24" r="7" fill="#38BDF8" />
      <circle cx="120" cy="24" r="3" fill="#FFFFFF" />

      {/* Robot Head Body */}
      <rect x="65" y="45" width="110" height="95" rx="28" fill="url(#aiHeadGrad)" />
      
      {/* Ear Transceivers */}
      <rect x="52" y="75" width="14" height="35" rx="7" fill="#4338CA" />
      <rect x="174" y="75" width="14" height="35" rx="7" fill="#4338CA" />
      <circle cx="59" cy="92" r="3" fill="#38BDF8" />
      <circle cx="181" cy="92" r="3" fill="#38BDF8" />

      {/* Screen Visor */}
      <rect x="76" y="58" width="88" height="68" rx="18" fill="url(#aiFaceGrad)" stroke="#818CF8" strokeWidth="1.5" />

      {/* Digital Glowing Eyes */}
      <circle cx="100" cy="90" r="10" fill="#38BDF8" />
      <circle cx="100" cy="90" r="4" fill="#FFFFFF" />
      <circle cx="140" cy="90" r="10" fill="#38BDF8" />
      <circle cx="140" cy="90" r="4" fill="#FFFFFF" />

      {/* Waveform Mouth */}
      <path d="M104 112 Q112 116 120 112 T136 112" stroke="#34D399" strokeWidth="3" strokeLinecap="round" fill="none" />

      {/* Floating Document Analysis Card */}
      <g transform="translate(130, 130)">
        <rect x="0" y="0" width="70" height="85" rx="10" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="2" filter="drop-shadow(0px 8px 16px rgba(15,23,42,0.1))" />
        <rect x="10" y="12" width="50" height="6" rx="3" fill="#6366F1" />
        <rect x="10" y="24" width="38" height="4" rx="2" fill="#94A3B8" />
        <rect x="10" y="32" width="44" height="4" rx="2" fill="#94A3B8" />
        <rect x="10" y="40" width="32" height="4" rx="2" fill="#94A3B8" />
        <circle cx="50" cy="62" r="12" fill="#10B981" />
        <path d="M46 62 L49 65 L55 58" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

export function ComplianceShieldIllustration({ className = 'w-48 h-48' }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="shieldGrad" x1="70" y1="40" x2="170" y2="200" gradientUnits="userSpaceOnUse">
          <stop stopColor="#10B981" />
          <stop offset="1" stopColor="#059669" />
        </linearGradient>
        <linearGradient id="shieldInnerGrad" x1="85" y1="55" x2="155" y2="185" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ECFDF5" />
          <stop offset="1" stopColor="#D1FAE5" />
        </linearGradient>
      </defs>

      {/* Ambient Ring */}
      <circle cx="120" cy="120" r="90" fill="#ECFDF5" stroke="#A7F3D0" strokeWidth="2" strokeDasharray="4 4" />

      {/* Outer Shield */}
      <path
        d="M120 40 L175 62 C175 125 155 175 120 200 C85 175 65 125 65 62 L120 40 Z"
        fill="url(#shieldGrad)"
        filter="drop-shadow(0 10px 20px rgba(5,150,105,0.25))"
      />

      {/* Inner Shield */}
      <path
        d="M120 54 L163 72 C163 122 147 162 120 184 C93 162 77 122 77 72 L120 54 Z"
        fill="url(#shieldInnerGrad)"
      />

      {/* Verified Checkmark */}
      <path
        d="M100 118 L114 132 L144 98"
        stroke="#059669"
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Orbiting Verification Badges */}
      <circle cx="65" cy="95" r="14" fill="#6366F1" />
      <path d="M60 95 L63 98 L70 91" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

      <circle cx="178" cy="145" r="16" fill="#0EA5E9" />
      <text x="178" y="150" fill="#FFFFFF" fontSize="13" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">§4</text>
    </svg>
  );
}

export function ClockPunchIllustration({ className = 'w-48 h-48' }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="clockOuter" x1="40" y1="40" x2="200" y2="200" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F8FAFC" />
          <stop offset="1" stopColor="#E2E8F0" />
        </linearGradient>
        <linearGradient id="dialGrad" x1="60" y1="60" x2="180" y2="180" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#F1F5F9" />
        </linearGradient>
      </defs>

      {/* Clock Outer Rim */}
      <circle cx="120" cy="120" r="82" fill="url(#clockOuter)" stroke="#CBD5E1" strokeWidth="4" filter="drop-shadow(0 12px 24px rgba(15,23,42,0.08))" />
      <circle cx="120" cy="120" r="70" fill="url(#dialGrad)" stroke="#E2E8F0" strokeWidth="2" />

      {/* Clock Hour Markers */}
      <circle cx="120" cy="62" r="3.5" fill="#64748B" />
      <circle cx="178" cy="120" r="3.5" fill="#64748B" />
      <circle cx="120" cy="178" r="3.5" fill="#64748B" />
      <circle cx="62" cy="120" r="3.5" fill="#64748B" />

      {/* Clock Hands: 09:00 Shift Start */}
      <line x1="120" y1="120" x2="120" y2="76" stroke="#1E293B" strokeWidth="5" strokeLinecap="round" />
      <line x1="120" y1="120" x2="84" y2="120" stroke="#6366F1" strokeWidth="4" strokeLinecap="round" />
      <circle cx="120" cy="120" r="6" fill="#4F46E5" />

      {/* Digital Badge Badge */}
      <g transform="translate(130, 135)">
        <rect x="0" y="0" width="76" height="42" rx="12" fill="#4F46E5" filter="drop-shadow(0 6px 12px rgba(79,70,229,0.3))" />
        <text x="38" y="26" fill="#FFFFFF" fontSize="13" fontWeight="bold" textAnchor="middle" fontFamily="monospace">09:00 AM</text>
      </g>
    </svg>
  );
}

export function EmptyInboxIllustration({ className = 'w-48 h-48' }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="boxGrad" x1="60" y1="100" x2="180" y2="190" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F1F5F9" />
          <stop offset="1" stopColor="#E2E8F0" />
        </linearGradient>
      </defs>

      {/* Background Radiance */}
      <circle cx="120" cy="120" r="85" fill="#F8FAFC" />

      {/* Sparkles */}
      <path d="M60 65 L63 56 L66 65 L75 68 L66 71 L63 80 L60 71 L51 68 Z" fill="#F59E0B" />
      <path d="M185 85 L187 79 L189 85 L195 87 L189 89 L187 95 L185 89 L179 87 Z" fill="#6366F1" />
      <path d="M170 45 L172 39 L174 45 L180 47 L174 49 L172 55 L170 49 L164 47 Z" fill="#10B981" />

      {/* Tray Box */}
      <path d="M50 115 L70 170 H170 L190 115 L155 115 L145 135 H95 L85 115 Z" fill="url(#boxGrad)" stroke="#CBD5E1" strokeWidth="2.5" />
      
      {/* Thumbs Up / Check Symbol */}
      <circle cx="120" cy="100" r="28" fill="#10B981" filter="drop-shadow(0 8px 16px rgba(16,185,129,0.3))" />
      <path d="M110 100 L117 107 L132 92" stroke="#FFFFFF" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

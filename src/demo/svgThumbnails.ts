export interface SvgThumbnailOptions {
  title: string;
  category: string;
  channel: string;
  duration: string;
  colorScheme?: 'indigo' | 'emerald' | 'amber' | 'rose' | 'cyan' | 'purple' | 'slate';
  pattern?: 'grid' | 'waves' | 'nodes' | 'rings';
}

const COLOR_SCHEMES = {
  indigo: {
    bg1: '#1e1b4b',
    bg2: '#312e81',
    accent: '#6366f1',
    glow: '#818cf8',
    textMuted: '#c7d2fe',
  },
  emerald: {
    bg1: '#064e3b',
    bg2: '#065f46',
    accent: '#10b981',
    glow: '#34d399',
    textMuted: '#a7f3d0',
  },
  amber: {
    bg1: '#451a03',
    bg2: '#78350f',
    accent: '#f59e0b',
    glow: '#fbbf24',
    textMuted: '#fde68a',
  },
  rose: {
    bg1: '#4c0519',
    bg2: '#831843',
    accent: '#f43f5e',
    glow: '#fb7185',
    textMuted: '#fecdd3',
  },
  cyan: {
    bg1: '#083344',
    bg2: '#164e63',
    accent: '#06b6d4',
    glow: '#22d3ee',
    textMuted: '#a5f3fc',
  },
  purple: {
    bg1: '#3b0764',
    bg2: '#581c87',
    accent: '#a855f7',
    glow: '#c084fc',
    textMuted: '#e9d5ff',
  },
  slate: {
    bg1: '#0f172a',
    bg2: '#1e293b',
    accent: '#64748b',
    glow: '#94a3b8',
    textMuted: '#cbd5e1',
  },
};

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function truncateText(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 1) + '…';
}

function renderPattern(pattern: 'grid' | 'waves' | 'nodes' | 'rings', accentColor: string): string {
  switch (pattern) {
    case 'grid':
      return `
        <defs>
          <pattern id="grid-pat" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="${accentColor}" stroke-opacity="0.12" stroke-width="1"/>
          </pattern>
        </defs>
        <rect width="640" height="360" fill="url(#grid-pat)"/>
      `;
    case 'waves':
      return `
        <path d="M0,280 Q160,200 320,260 T640,220 L640,360 L0,360 Z" fill="${accentColor}" fill-opacity="0.08"/>
        <path d="M0,300 Q160,240 320,290 T640,260 L640,360 L0,360 Z" fill="${accentColor}" fill-opacity="0.12"/>
      `;
    case 'nodes':
      return `
        <g stroke="${accentColor}" stroke-opacity="0.15" stroke-width="1.5">
          <line x1="120" y1="80" x2="280" y2="140"/>
          <line x1="280" y1="140" x2="480" y2="90"/>
          <line x1="280" y1="140" x2="360" y2="260"/>
          <line x1="480" y1="90" x2="560" y2="180"/>
        </g>
        <g fill="${accentColor}" fill-opacity="0.3">
          <circle cx="120" cy="80" r="5"/>
          <circle cx="280" cy="140" r="7"/>
          <circle cx="480" cy="90" r="6"/>
          <circle cx="360" cy="260" r="5"/>
          <circle cx="560" cy="180" r="8"/>
        </g>
      `;
    case 'rings':
      return `
        <circle cx="520" cy="180" r="160" fill="none" stroke="${accentColor}" stroke-opacity="0.08" stroke-width="2"/>
        <circle cx="520" cy="180" r="110" fill="none" stroke="${accentColor}" stroke-opacity="0.12" stroke-width="2"/>
        <circle cx="520" cy="180" r="60" fill="none" stroke="${accentColor}" stroke-opacity="0.16" stroke-width="1.5"/>
      `;
  }
}

/**
 * Genera una stringa SVG pura (16:9 640x360) per le anteprime demo.
 * Non usa immagini esterne né risorse di terze parti.
 */
export function generateSvgThumbnail(options: SvgThumbnailOptions): string {
  const scheme = COLOR_SCHEMES[options.colorScheme || 'indigo'];
  const pattern = options.pattern || 'grid';

  const titleEsc = escapeXml(truncateText(options.title, 55));
  const categoryEsc = escapeXml(options.category.toUpperCase());
  const channelEsc = escapeXml(truncateText(options.channel, 28));

  // Suddivide il titolo in due righe se troppo lungo
  const words = titleEsc.split(' ');
  let line1 = '';
  let line2 = '';
  for (const word of words) {
    if ((line1 + ' ' + word).trim().length < 28 && !line2) {
      line1 = (line1 + ' ' + word).trim();
    } else {
      line2 = (line2 + ' ' + word).trim();
    }
  }
  if (!line2) {
    line2 = '';
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360" width="100%" height="100%">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${scheme.bg1}"/>
      <stop offset="100%" stop-color="${scheme.bg2}"/>
    </linearGradient>
    <radialGradient id="glow" cx="80%" cy="20%" r="60%">
      <stop offset="0%" stop-color="${scheme.glow}" stop-opacity="0.25"/>
      <stop offset="100%" stop-color="${scheme.bg1}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="badgeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${scheme.accent}"/>
      <stop offset="100%" stop-color="${scheme.glow}"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="640" height="360" fill="url(#bgGrad)"/>
  <rect width="640" height="360" fill="url(#glow)"/>

  <!-- Geometric pattern -->
  ${renderPattern(pattern, scheme.accent)}

  <!-- Top badge: Category -->
  <g transform="translate(36, 40)">
    <rect width="${Math.max(100, categoryEsc.length * 9 + 24)}" height="26" rx="6" fill="#000000" fill-opacity="0.45" stroke="${scheme.accent}" stroke-opacity="0.4" stroke-width="1"/>
    <circle cx="14" cy="13" r="4" fill="${scheme.glow}"/>
    <text x="26" y="17" fill="${scheme.textMuted}" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="700" letter-spacing="1">${categoryEsc}</text>
  </g>

  <!-- Decorative Tubo emblem -->
  <g transform="translate(570, 44)" opacity="0.65">
    <circle cx="16" cy="16" r="16" fill="#000000" fill-opacity="0.3"/>
    <path d="M12 10 L22 16 L12 22 Z" fill="${scheme.glow}"/>
  </g>

  <!-- Title lines -->
  <g transform="translate(36, 155)">
    <text x="0" y="0" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="26" font-weight="800" letter-spacing="-0.5">
      ${line1}
    </text>
    ${
      line2
        ? `<text x="0" y="36" fill="#f1f5f9" font-family="system-ui, -apple-system, sans-serif" font-size="26" font-weight="800" letter-spacing="-0.5">${line2}</text>`
        : ''
    }
  </g>

  <!-- Channel Footer -->
  <g transform="translate(36, 290)">
    <circle cx="18" cy="18" r="18" fill="url(#badgeGrad)"/>
    <text x="18" y="24" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="15" font-weight="bold" text-anchor="middle">
      ${channelEsc.charAt(0)}
    </text>
    <text x="46" y="23" fill="#e2e8f0" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="600">
      ${channelEsc}
    </text>
  </g>

  <!-- Bottom border accent -->
  <rect x="0" y="354" width="640" height="6" fill="url(#badgeGrad)"/>
</svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

import { Component, Input } from '@angular/core';

// Decorative header illustration, one scene per module — same hand-drawn
// vignette style as the dashboard's sunrise art. Drops into a .page-header
// (which is position:relative) and floats to the right of the title, in
// front of the aurora and behind the action button. Pure decoration:
// pointer-transparent, hidden on narrow screens.
@Component({
  selector: 'app-page-art',
  standalone: true,
  template: `
    <svg viewBox="0 0 320 120" fill="none" aria-hidden="true">
      @switch (scene) {

        @case ('trips') {
          <defs>
            <linearGradient id="tpMt1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#8b5cf6"/><stop offset="100%" stop-color="#2e1065"/></linearGradient>
            <linearGradient id="tpMt2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#4c3a8f"/><stop offset="100%" stop-color="#1b1240"/></linearGradient>
            <radialGradient id="tpSun" cx=".5" cy=".45" r=".6"><stop offset="0%" stop-color="#fef3c7"/><stop offset="55%" stop-color="#fcd34d"/><stop offset="100%" stop-color="#f59e0b"/></radialGradient>
            <radialGradient id="tpHalo" cx=".5" cy=".5" r=".5"><stop offset="0%" stop-color="#fbbf24" stop-opacity=".5"/><stop offset="100%" stop-color="#fbbf24" stop-opacity="0"/></radialGradient>
            <linearGradient id="tpAur" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#34d399" stop-opacity="0"/><stop offset="50%" stop-color="#34d399" stop-opacity=".5"/><stop offset="100%" stop-color="#2dd4bf" stop-opacity="0"/></linearGradient>
          </defs>
          <path d="M20 26 C 90 2, 210 40, 310 10" stroke="url(#tpAur)" stroke-width="16" stroke-linecap="round" opacity=".7"/>
          <ellipse cx="190" cy="74" rx="64" ry="40" fill="url(#tpHalo)"/>
          <circle cx="190" cy="72" r="24" fill="url(#tpSun)"/>
          <path d="M60 120 L118 44 L152 86 L176 60 L220 120 Z" fill="url(#tpMt2)"/>
          <path d="M150 120 L212 52 L244 88 L268 68 L312 120 Z" fill="url(#tpMt1)"/>
          <path d="M212 52 l10 12 -8 2 -8-4 z" fill="#ddd6fe" opacity=".85"/>
          <path d="M34 120 l11-24 11 24 z M26 120 l8-16 8 16 z" fill="#0a4435"/>
          <path d="M292 120 l10-20 10 20 z" fill="#0a4435"/>
          <g fill="#fcd34d"><circle cx="66" cy="28" r="1.6" opacity=".8"/><circle cx="256" cy="22" r="1.3" opacity=".6"/><circle cx="130" cy="16" r="1.4" opacity=".7"/></g>
        }

        @case ('plans') {
          <defs>
            <linearGradient id="plHill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#16b47d"/><stop offset="100%" stop-color="#07432e"/></linearGradient>
            <linearGradient id="plHill2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#2dd48f"/><stop offset="100%" stop-color="#0b5c3e"/></linearGradient>
            <radialGradient id="plGlow" cx=".5" cy=".5" r=".5"><stop offset="0%" stop-color="#34d399" stop-opacity=".35"/><stop offset="100%" stop-color="#34d399" stop-opacity="0"/></radialGradient>
          </defs>
          <ellipse cx="240" cy="44" rx="70" ry="38" fill="url(#plGlow)"/>
          <path d="M4 120 C 60 96, 130 92, 200 74 C 230 66, 254 66, 274 78 C 294 90, 308 108, 318 120 Z" fill="url(#plHill)"/>
          <path d="M110 120 C 180 98, 250 100, 312 118 C 313 118.6, 314 120, 314 120 Z" fill="url(#plHill2)" opacity=".85"/>
          <path d="M40 112 C 110 100, 150 78, 238 60" stroke="#fef3c7" stroke-width="3" stroke-dasharray="7 8" stroke-linecap="round" opacity=".9"/>
          <rect x="236" y="26" width="3.4" height="36" rx="1.7" fill="#e2e8f0"/>
          <path d="M239.4 27 h30 v16 h-30 z" fill="#34d399"/>
          <path d="M239.4 27 h10 v8 h-10 z M249.4 35 h10 v8 h-10 z M259.4 27 h10 v8 h-10 z" fill="#065f46"/>
          <g>
            <path d="M96 76 a9 9 0 1 1 .01 0 M96 76 l0 14" stroke="#f472b6" stroke-width="4" stroke-linecap="round" fill="none"/>
            <circle cx="96" cy="68" r="3.4" fill="#fff"/>
          </g>
          <g>
            <path d="M172 60 a8 8 0 1 1 .01 0 M172 60 l0 12" stroke="#60a5fa" stroke-width="3.6" stroke-linecap="round" fill="none"/>
            <circle cx="172" cy="53" r="3" fill="#fff"/>
          </g>
          <g fill="#fcd34d"><circle cx="286" cy="20" r="1.6" opacity=".8"/><circle cx="206" cy="14" r="1.3" opacity=".6"/></g>
        }

        @case ('goals') {
          <defs>
            <linearGradient id="goPk" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#4f46e5"/><stop offset="100%" stop-color="#171447"/></linearGradient>
            <linearGradient id="goPk2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#312e81"/><stop offset="100%" stop-color="#10103a"/></linearGradient>
            <radialGradient id="goGlow" cx=".5" cy=".5" r=".5"><stop offset="0%" stop-color="#34d399" stop-opacity=".45"/><stop offset="100%" stop-color="#34d399" stop-opacity="0"/></radialGradient>
          </defs>
          <ellipse cx="208" cy="34" rx="56" ry="30" fill="url(#goGlow)"/>
          <path d="M60 120 L130 58 L168 96 L198 72 L250 120 Z" fill="url(#goPk2)"/>
          <path d="M130 120 L208 30 L286 120 Z" fill="url(#goPk)"/>
          <path d="M208 30 l14 17 -9 1 -6 6 -7-5 -8 0 z" fill="#e0e7ff" opacity=".9"/>
          <rect x="206.4" y="8" width="3.2" height="26" rx="1.6" fill="#e2e8f0"/>
          <path d="M209.6 9 l22 6 -22 6 z" fill="#34d399"/>
          <path d="M238 112 C 230 96, 236 72, 214 44" stroke="#fef3c7" stroke-width="2.4" stroke-dasharray="1 9" stroke-linecap="round" opacity=".9"/>
          <path d="M52 22 a9 9 0 1 0 9 12 7 7 0 1 1 -9 -12z" fill="#fcd34d" opacity=".85"/>
          <g fill="#fcd34d"><circle cx="96" cy="40" r="1.6" opacity=".8"/><circle cx="286" cy="26" r="1.4" opacity=".6"/><circle cx="160" cy="18" r="1.3" opacity=".7"/></g>
        }

        @case ('routine') {
          <defs>
            <radialGradient id="rtSun" cx=".5" cy=".45" r=".6"><stop offset="0%" stop-color="#fef3c7"/><stop offset="55%" stop-color="#fcd34d"/><stop offset="100%" stop-color="#f59e0b"/></radialGradient>
            <radialGradient id="rtHalo" cx=".5" cy=".5" r=".5"><stop offset="0%" stop-color="#fbbf24" stop-opacity=".5"/><stop offset="100%" stop-color="#fbbf24" stop-opacity="0"/></radialGradient>
            <linearGradient id="rtHill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#16b47d"/><stop offset="100%" stop-color="#07432e"/></linearGradient>
            <linearGradient id="rtHill2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#2dd48f"/><stop offset="100%" stop-color="#0b5c3e"/></linearGradient>
          </defs>
          <path d="M70 96 A 96 96 0 0 1 258 88" stroke="#fcd34d" stroke-width="2" stroke-dasharray="2 10" stroke-linecap="round" opacity=".65"/>
          <path d="M66 32 a11 11 0 1 0 11 15 8.6 8.6 0 1 1 -11 -15z" fill="#cbd5e1" opacity=".9"/>
          <ellipse cx="228" cy="62" rx="58" ry="38" fill="url(#rtHalo)"/>
          <circle cx="228" cy="60" r="22" fill="url(#rtSun)"/>
          <g stroke="#fcd34d" stroke-width="2.6" stroke-linecap="round" opacity=".9">
            <path d="M228 28v-8M228 92v4M196 60h-8M260 60h8M205 37l-6-6M251 83l4 4M251 37l6-6M205 83l-4 4"/>
          </g>
          <path d="M6 120 C 60 88, 140 92, 220 105 C 266 112, 300 117, 314 120 Z" fill="url(#rtHill)"/>
          <path d="M104 120 C 175 97, 248 102, 314 119 C 315 119.6, 316 120, 316 120 Z" fill="url(#rtHill2)" opacity=".85"/>
          <g fill="#fcd34d"><circle cx="120" cy="24" r="1.5" opacity=".7"/><circle cx="170" cy="14" r="1.3" opacity=".6"/><circle cx="296" cy="26" r="1.5" opacity=".7"/></g>
        }

        @case ('journal') {
          <defs>
            <linearGradient id="joCov" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#2dd4bf"/><stop offset="100%" stop-color="#0d9488"/></linearGradient>
            <radialGradient id="joGlow" cx=".5" cy=".5" r=".5"><stop offset="0%" stop-color="#2dd4bf" stop-opacity=".3"/><stop offset="100%" stop-color="#2dd4bf" stop-opacity="0"/></radialGradient>
          </defs>
          <ellipse cx="170" cy="78" rx="100" ry="40" fill="url(#joGlow)"/>
          <path d="M96 24 a13 13 0 1 0 13 18 10 10 0 1 1 -13 -18z" fill="#fcd34d" opacity=".9"/>
          <ellipse cx="172" cy="104" rx="76" ry="7" fill="#000" opacity=".25"/>
          <path d="M108 56 q32 -14 64 0 l0 46 q-32 -12 -64 0 z" fill="url(#joCov)"/>
          <path d="M236 56 q-32 -14 -64 0 l0 46 q32 -12 64 0 z" fill="url(#joCov)"/>
          <path d="M112 58 q30 -12 58 0 l0 40 q-28 -10 -58 0 z" fill="#f8fafc"/>
          <path d="M232 58 q-30 -12 -58 0 l0 40 q28 -10 58 0 z" fill="#eef2f7"/>
          <g stroke="#94a3b8" stroke-width="1.8" stroke-linecap="round" opacity=".8">
            <path d="M120 66 q22 -8 42 0M120 74 q22 -8 42 0M120 82 q22 -8 42 0"/>
            <path d="M224 66 q-22 -8 -42 0M224 74 q-22 -8 -42 0"/>
          </g>
          <path d="M248 86 l26 -30 6 5 -26 30 -8 3 z" fill="#f472b6"/>
          <path d="M274 56 l6 5 4 -5 -6 -5 z" fill="#fbbf24"/>
          <g fill="#fcd34d"><circle cx="134" cy="22" r="1.5" opacity=".8"/><circle cx="252" cy="26" r="1.6" opacity=".7"/><circle cx="208" cy="14" r="1.3" opacity=".6"/></g>
        }

        @case ('projects') {
          <defs>
            <linearGradient id="prScr" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#0f2a3f"/><stop offset="100%" stop-color="#0a1626"/></linearGradient>
            <radialGradient id="prGlow" cx=".5" cy=".5" r=".5"><stop offset="0%" stop-color="#34d399" stop-opacity=".3"/><stop offset="100%" stop-color="#34d399" stop-opacity="0"/></radialGradient>
          </defs>
          <ellipse cx="172" cy="74" rx="100" ry="42" fill="url(#prGlow)"/>
          <ellipse cx="176" cy="106" rx="92" ry="6" fill="#000" opacity=".25"/>
          <rect x="112" y="30" width="112" height="68" rx="7" fill="#1e293b"/>
          <rect x="118" y="36" width="100" height="56" rx="4" fill="url(#prScr)"/>
          <g stroke-linecap="round" stroke-width="3.4">
            <path d="M126 46 h30" stroke="#f472b6"/>
            <path d="M126 55 h46" stroke="#34d399"/>
            <path d="M134 64 h38" stroke="#60a5fa"/>
            <path d="M134 73 h24" stroke="#fbbf24"/>
            <path d="M126 82 h40" stroke="#34d399" opacity=".7"/>
          </g>
          <path d="M100 98 h136 l-8 8 a8 8 0 0 1 -6 3 H114 a8 8 0 0 1 -6 -3 z" fill="#334155"/>
          <g>
            <path d="M258 78 h24 v20 a8 8 0 0 1 -8 8 h-8 a8 8 0 0 1 -8 -8 z" fill="#f8fafc"/>
            <path d="M282 82 h7 a6 6 0 0 1 0 12 h-7" stroke="#f8fafc" stroke-width="3.4" fill="none"/>
            <path d="M265 70 q3 -5 0 -9 M273 70 q3 -5 0 -9" stroke="#94a3b8" stroke-width="2.2" stroke-linecap="round"/>
          </g>
          <g fill="#fcd34d"><circle cx="92" cy="30" r="1.5" opacity=".7"/><circle cx="246" cy="22" r="1.4" opacity=".6"/></g>
        }

        @case ('buylist') {
          <defs>
            <linearGradient id="buB1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#f9a8d4"/><stop offset="100%" stop-color="#db2777"/></linearGradient>
            <linearGradient id="buB2" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#2dd4bf"/><stop offset="100%" stop-color="#0d9488"/></linearGradient>
            <radialGradient id="buGlow" cx=".5" cy=".5" r=".5"><stop offset="0%" stop-color="#f472b6" stop-opacity=".3"/><stop offset="100%" stop-color="#f472b6" stop-opacity="0"/></radialGradient>
          </defs>
          <ellipse cx="178" cy="76" rx="100" ry="40" fill="url(#buGlow)"/>
          <ellipse cx="180" cy="106" rx="86" ry="6" fill="#000" opacity=".25"/>
          <g>
            <path d="M118 56 h58 l-5 48 h-48 z" fill="url(#buB1)"/>
            <path d="M133 56 v-6 a14 14 0 0 1 28 0 v6" stroke="#9d174d" stroke-width="4" fill="none" stroke-linecap="round"/>
            <path d="M118 56 h58 l-1.4 13 h-55.2 z" fill="#fff" opacity=".2"/>
          </g>
          <g>
            <path d="M186 68 h46 l-4 36 h-38 z" fill="url(#buB2)"/>
            <path d="M198 68 v-5 a11 11 0 0 1 22 0 v5" stroke="#115e59" stroke-width="3.6" fill="none" stroke-linecap="round"/>
          </g>
          <g transform="rotate(14 252 50)">
            <path d="M240 40 h26 l8 10 -8 10 h-26 z" fill="#fbbf24"/>
            <circle cx="268" cy="50" r="2.6" fill="#92400e"/>
            <path d="M246 50 h12" stroke="#92400e" stroke-width="2.4" stroke-linecap="round"/>
          </g>
          <g fill="#fcd34d"><circle cx="104" cy="34" r="1.6" opacity=".8"/><circle cx="252" cy="24" r="1.4" opacity=".7"/><circle cx="286" cy="76" r="1.5" opacity=".6"/></g>
        }

        @case ('calendar') {
          <defs>
            <linearGradient id="caHd" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#34d399"/><stop offset="100%" stop-color="#0d9488"/></linearGradient>
            <radialGradient id="caGlow" cx=".5" cy=".5" r=".5"><stop offset="0%" stop-color="#34d399" stop-opacity=".3"/><stop offset="100%" stop-color="#34d399" stop-opacity="0"/></radialGradient>
          </defs>
          <ellipse cx="172" cy="68" rx="96" ry="42" fill="url(#caGlow)"/>
          <ellipse cx="172" cy="104" rx="76" ry="6" fill="#000" opacity=".25"/>
          <g transform="rotate(-4 170 64)">
            <rect x="120" y="30" width="100" height="74" rx="10" fill="#f8fafc"/>
            <path d="M120 40 a10 10 0 0 1 10 -10 h80 a10 10 0 0 1 10 10 v12 h-100 z" fill="url(#caHd)"/>
            <rect x="138" y="22" width="6" height="16" rx="3" fill="#e2e8f0"/><rect x="196" y="22" width="6" height="16" rx="3" fill="#e2e8f0"/>
            <g fill="#cbd5e1">
              <circle cx="138" cy="66" r="4"/><circle cx="156" cy="66" r="4"/><circle cx="174" cy="66" r="4"/><circle cx="192" cy="66" r="4"/>
              <circle cx="138" cy="82" r="4"/><circle cx="174" cy="82" r="4"/><circle cx="192" cy="82" r="4"/><circle cx="156" cy="94" r="4"/>
            </g>
            <circle cx="156" cy="82" r="7.5" fill="#34d399"/>
            <path d="M152.6 82 l2.4 2.4 4.4 -4.8" stroke="#06281c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
          </g>
          <path d="M246 44 a10 10 0 0 1 18 -4 8 8 0 0 1 6 14 h-22 a8 8 0 0 1 -2 -10z" fill="#64748b" opacity=".55"/>
          <circle cx="92" cy="36" r="11" fill="#fcd34d" opacity=".9"/>
          <g stroke="#fcd34d" stroke-width="2.2" stroke-linecap="round" opacity=".8"><path d="M92 20v-5M92 57v-5M76 36h-5M113 36h-5"/></g>
        }

        @case ('analytics') {
          <defs>
            <linearGradient id="anB1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#34d399"/><stop offset="100%" stop-color="#059669"/></linearGradient>
            <linearGradient id="anB2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#a78bfa"/><stop offset="100%" stop-color="#6d28d9"/></linearGradient>
            <linearGradient id="anB3" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#60a5fa"/><stop offset="100%" stop-color="#2563eb"/></linearGradient>
            <linearGradient id="anB4" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#fde047"/><stop offset="100%" stop-color="#f59e0b"/></linearGradient>
            <radialGradient id="anGlow" cx=".5" cy=".5" r=".5"><stop offset="0%" stop-color="#34d399" stop-opacity=".3"/><stop offset="100%" stop-color="#34d399" stop-opacity="0"/></radialGradient>
          </defs>
          <ellipse cx="180" cy="70" rx="110" ry="44" fill="url(#anGlow)"/>
          <path d="M96 110 h210" stroke="#475569" stroke-width="2" stroke-linecap="round" opacity=".6"/>
          <rect x="112" y="72" width="26" height="38" rx="6" fill="url(#anB2)"/>
          <rect x="150" y="56" width="26" height="54" rx="6" fill="url(#anB3)"/>
          <rect x="188" y="78" width="26" height="32" rx="6" fill="url(#anB4)"/>
          <rect x="226" y="40" width="26" height="70" rx="6" fill="url(#anB1)"/>
          <path d="M108 70 C 150 56, 186 66, 216 44 L 252 26" stroke="#f472b6" stroke-width="3.4" stroke-linecap="round" fill="none"/>
          <path d="M252 26 l-11 -1 M252 26 l-3 10" stroke="#f472b6" stroke-width="3.4" stroke-linecap="round"/>
          <g fill="#fcd34d"><circle cx="96" cy="34" r="1.6" opacity=".8"/><circle cx="276" cy="52" r="1.5" opacity=".7"/><circle cx="196" cy="20" r="1.3" opacity=".6"/></g>
        }
      }
    </svg>
  `,
  styles: [`
    :host {
      position: absolute; right: 150px; top: 50%; transform: translateY(-50%);
      height: 96px; pointer-events: none; line-height: 0; z-index: 0;
    }
    :host svg { height: 100%; width: auto; }
    @media (max-width: 1100px) { :host { display: none; } }
    /* Phones: the header stacks vertically, leaving the right side of the
       module name free — show a compact figure there */
    @media (max-width: 768px) {
      :host { display: block; right: 0; top: -4px; transform: none; height: 76px; }
    }
  `],
})
export class PageArtComponent {
  @Input({ required: true }) scene = 'plans';
}

// Broadcast graphics model. Deliberately follows the CasparCG CG paradigm
// (template item + play / stop / update lifecycle, layered z-order) so the
// system maps onto real broadcast workflows — but it is implemented natively
// on the Apache-2.0 Babylon.js GUI runtime. CasparCG itself is GPL-3.0 and is
// referenced only as a design model; none of its code is used here.

export type GraphicType = 'lowerThird' | 'ticker' | 'logoBug';

export type Corner = 'tl' | 'tr' | 'bl' | 'br';

/** Live animation state of an on-air graphic (CasparCG: stopped/playing). */
export type GraphicPlayState = 'idle' | 'in' | 'on' | 'out';

export interface GraphicItem {
  id: string;
  type: GraphicType;
  /** Higher layers render on top (CasparCG CG layer concept). */
  layer: number;
  accentColor: string;
  /** In/out animation length in seconds. */
  animDuration: number;

  // Lower third (name strap)
  title?: string;
  subtitle?: string;

  // Ticker / headline crawl
  tickerText?: string;
  tickerSpeed?: number; // pixels per second

  // Logo bug / watermark
  logoText?: string;
  corner?: Corner;
  opacity?: number; // 0–1
}

export function makeGraphicId(): string {
  return `gfx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function defaultGraphic(type: GraphicType, layer: number): GraphicItem {
  const base = {
    id: makeGraphicId(),
    type,
    layer,
    accentColor: '#1a73e8',
    animDuration: 0.6,
  };
  switch (type) {
    case 'lowerThird':
      return { ...base, title: 'JANE DOE', subtitle: 'Senior Correspondent' };
    case 'ticker':
      return { ...base, tickerText: 'BREAKING NEWS  —  Live coverage continues across all regions  —  Stay tuned for updates', tickerSpeed: 90 };
    case 'logoBug':
      return { ...base, logoText: 'CHASE', corner: 'tr', opacity: 0.85 };
  }
}

export function graphicLabel(item: GraphicItem): string {
  switch (item.type) {
    case 'lowerThird':
      return item.title || 'Lower Third';
    case 'ticker':
      return 'Ticker';
    case 'logoBug':
      return item.logoText ? `Logo · ${item.logoText}` : 'Logo Bug';
  }
}

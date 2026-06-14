import type { Scene } from '@babylonjs/core';
import { AdvancedDynamicTexture } from '@babylonjs/gui/2D/advancedDynamicTexture';
import { Rectangle } from '@babylonjs/gui/2D/controls/rectangle';
import { TextBlock } from '@babylonjs/gui/2D/controls/textBlock';
import { Control } from '@babylonjs/gui/2D/controls/control';
import type { GraphicItem, GraphicPlayState } from './graphicsTypes';

// Real broadcast graphics overlay. Renders lower thirds, tickers and logo bugs
// as a fullscreen Babylon GUI layer ON the live scene, so the graphics appear
// in the actual rendered frame (and therefore in any captured thumbnail or
// output stream). Animations are driven from the scene render loop using real
// frame delta time — nothing is faked.

interface LiveGraphic {
  item: GraphicItem;
  state: GraphicPlayState;
  /** 0→1 progress through the current in/out animation. */
  progress: number;
  /** Seconds the graphic has been fully on (for ticker scroll, etc.). */
  elapsed: number;
  root: Rectangle;
  // Per-type live controls we mutate during animation / update.
  tickerText?: TextBlock;
  tickerWidth?: number;
}

const CORNER_ALIGN: Record<string, { h: number; v: number }> = {
  tl: { h: Control.HORIZONTAL_ALIGNMENT_LEFT, v: Control.VERTICAL_ALIGNMENT_TOP },
  tr: { h: Control.HORIZONTAL_ALIGNMENT_RIGHT, v: Control.VERTICAL_ALIGNMENT_TOP },
  bl: { h: Control.HORIZONTAL_ALIGNMENT_LEFT, v: Control.VERTICAL_ALIGNMENT_BOTTOM },
  br: { h: Control.HORIZONTAL_ALIGNMENT_RIGHT, v: Control.VERTICAL_ALIGNMENT_BOTTOM },
};

export class BroadcastGraphics {
  private ui: AdvancedDynamicTexture | null = null;
  private live = new Map<string, LiveGraphic>();
  private scene: Scene;
  private renderObserver: ReturnType<Scene['onBeforeRenderObservable']['add']> | null = null;

  constructor(scene: Scene) {
    this.scene = scene;
    this.ui = AdvancedDynamicTexture.CreateFullscreenUI('chase-broadcast-gfx', true, scene);
    // Idealize to 1080p so layouts are resolution-independent.
    this.ui.idealWidth = 1920;
    this.ui.idealHeight = 1080;
    this.ui.useSmallestIdeal = false;
    this.ui.renderAtIdealSize = true;

    this.renderObserver = this.scene.onBeforeRenderObservable.add(() => {
      const dtMs = this.scene.getEngine().getDeltaTime();
      this.tick(dtMs / 1000);
    });
  }

  /** Play (or restart) a graphic — animates it in. */
  play(item: GraphicItem) {
    const existing = this.live.get(item.id);
    if (existing) {
      // Already on screen: treat as an update of data, keep it on.
      existing.item = item;
      this.applyData(existing);
      return;
    }
    if (!this.ui) return;
    const root = this.buildRoot(item);
    this.ui.addControl(root);
    const lg: LiveGraphic = { item, state: 'in', progress: 0, elapsed: 0, root };
    this.live.set(item.id, lg);
    this.buildContent(lg);
    this.applyAnim(lg);
  }

  /** Stop a graphic — animates it out, then disposes. */
  stop(id: string) {
    const lg = this.live.get(id);
    if (!lg) return;
    if (lg.state === 'out' || lg.state === 'idle') return;
    lg.state = 'out';
    lg.progress = 0;
  }

  /** Update an on-air graphic's data live (CasparCG CG UPDATE). */
  update(item: GraphicItem) {
    const lg = this.live.get(item.id);
    if (!lg) return;
    lg.item = item;
    this.applyData(lg);
  }

  isOn(id: string): boolean {
    const lg = this.live.get(id);
    return !!lg && lg.state !== 'idle';
  }

  clear() {
    for (const id of [...this.live.keys()]) {
      const lg = this.live.get(id);
      lg?.root.dispose();
      this.live.delete(id);
    }
  }

  dispose() {
    this.clear();
    if (this.renderObserver) this.scene.onBeforeRenderObservable.remove(this.renderObserver);
    this.ui?.dispose();
    this.ui = null;
  }

  // ---- internal ----------------------------------------------------------

  private tick(dt: number) {
    for (const [id, lg] of this.live) {
      const dur = Math.max(0.05, lg.item.animDuration);
      if (lg.state === 'in') {
        lg.progress = Math.min(1, lg.progress + dt / dur);
        this.applyAnim(lg);
        if (lg.progress >= 1) lg.state = 'on';
      } else if (lg.state === 'on') {
        lg.elapsed += dt;
        this.applyAnim(lg);
      } else if (lg.state === 'out') {
        lg.progress = Math.min(1, lg.progress + dt / dur);
        this.applyAnim(lg);
        if (lg.progress >= 1) {
          lg.root.dispose();
          this.live.delete(id);
        }
      }
    }
  }

  /** Ease-out cubic for natural broadcast motion. */
  private ease(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  private buildRoot(item: GraphicItem): Rectangle {
    const root = new Rectangle(`gfx-root-${item.id}`);
    root.thickness = 0;
    root.background = 'transparent';
    root.zIndex = item.layer;
    root.isHitTestVisible = false;
    root.width = '100%';
    root.height = '100%';
    return root;
  }

  private buildContent(lg: LiveGraphic) {
    switch (lg.item.type) {
      case 'lowerThird':
        this.buildLowerThird(lg);
        break;
      case 'ticker':
        this.buildTicker(lg);
        break;
      case 'logoBug':
        this.buildLogoBug(lg);
        break;
    }
    this.applyFont(lg);
  }

  /** Apply the item's font family to every text block in the graphic. */
  private applyFont(lg: LiveGraphic) {
    const family = lg.item.fontFamily || 'Inter, sans-serif';
    lg.root.getDescendants(false).forEach((c) => {
      if (c instanceof TextBlock) c.fontFamily = family;
    });
  }

  private buildLowerThird(lg: LiveGraphic) {
    const { item, root } = lg;
    const card = new Rectangle(`lt-card-${item.id}`);
    card.height = '150px';
    card.width = '720px';
    card.thickness = 0;
    card.cornerRadius = 4;
    card.background = 'rgba(8,12,20,0.82)';
    card.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    card.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    card.left = '90px';
    card.top = '-120px';
    card.name = `lt-card-${item.id}`;
    root.addControl(card);

    // Accent bar
    const accent = new Rectangle(`lt-accent-${item.id}`);
    accent.width = '10px';
    accent.thickness = 0;
    accent.background = item.accentColor;
    accent.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    card.addControl(accent);

    const title = new TextBlock(`lt-title-${item.id}`, item.title ?? '');
    title.color = '#ffffff';
    title.fontSize = 46;
    title.fontWeight = '700';
    title.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    title.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    title.paddingLeft = '34px';
    title.paddingTop = '28px';
    title.name = `lt-title-${item.id}`;
    card.addControl(title);

    const subtitle = new TextBlock(`lt-sub-${item.id}`, item.subtitle ?? '');
    subtitle.color = item.accentColor;
    subtitle.fontSize = 26;
    subtitle.fontWeight = '500';
    subtitle.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    subtitle.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    subtitle.paddingLeft = '34px';
    subtitle.paddingBottom = '30px';
    subtitle.name = `lt-sub-${item.id}`;
    card.addControl(subtitle);
  }

  private buildTicker(lg: LiveGraphic) {
    const { item, root } = lg;
    const bar = new Rectangle(`tk-bar-${item.id}`);
    bar.height = '64px';
    bar.width = '100%';
    bar.thickness = 0;
    bar.background = 'rgba(8,12,20,0.9)';
    bar.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    bar.top = '0px';
    bar.clipChildren = true;
    bar.name = `tk-bar-${item.id}`;
    root.addControl(bar);

    // Category flag on the left
    const flag = new Rectangle(`tk-flag-${item.id}`);
    flag.width = '150px';
    flag.thickness = 0;
    flag.background = item.accentColor;
    flag.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    bar.addControl(flag);

    const flagText = new TextBlock(`tk-flagtext-${item.id}`, 'LIVE');
    flagText.color = '#ffffff';
    flagText.fontSize = 28;
    flagText.fontWeight = '700';
    flag.addControl(flagText);

    const text = new TextBlock(`tk-text-${item.id}`, item.tickerText ?? '');
    text.color = '#ffffff';
    text.fontSize = 30;
    text.fontWeight = '500';
    text.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    text.resizeToFit = true;
    text.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    text.left = '1920px'; // start off the right edge; scrolls left
    text.name = `tk-text-${item.id}`;
    bar.addControl(text);

    lg.tickerText = text;
  }

  private buildLogoBug(lg: LiveGraphic) {
    const { item, root } = lg;
    const align = CORNER_ALIGN[item.corner ?? 'tr'];
    const badge = new Rectangle(`bug-${item.id}`);
    badge.width = '150px';
    badge.height = '60px';
    badge.thickness = 2;
    badge.color = item.accentColor;
    badge.cornerRadius = 6;
    badge.background = 'rgba(8,12,20,0.6)';
    badge.horizontalAlignment = align.h;
    badge.verticalAlignment = align.v;
    badge.left = align.h === Control.HORIZONTAL_ALIGNMENT_RIGHT ? '-40px' : '40px';
    badge.top = align.v === Control.VERTICAL_ALIGNMENT_BOTTOM ? '-100px' : '40px';
    badge.name = `bug-${item.id}`;
    root.addControl(badge);

    const text = new TextBlock(`bug-text-${item.id}`, item.logoText ?? '');
    text.color = '#ffffff';
    text.fontSize = 30;
    text.fontWeight = '800';
    text.name = `bug-text-${item.id}`;
    badge.addControl(text);
  }

  /** Re-apply data (text/colour) to live controls without rebuilding. */
  private applyData(lg: LiveGraphic) {
    const { item, root } = lg;
    const find = (suffix: string) => root.getDescendants(false).find((c) => c.name === `${suffix}-${item.id}`);
    if (item.type === 'lowerThird') {
      const title = find('lt-title') as TextBlock | undefined;
      const sub = find('lt-sub') as TextBlock | undefined;
      const accent = find('lt-accent') as Rectangle | undefined;
      if (title) title.text = item.title ?? '';
      if (sub) { sub.text = item.subtitle ?? ''; sub.color = item.accentColor; }
      if (accent) accent.background = item.accentColor;
    } else if (item.type === 'ticker') {
      if (lg.tickerText) lg.tickerText.text = item.tickerText ?? '';
      const flag = find('tk-flag') as Rectangle | undefined;
      if (flag) flag.background = item.accentColor;
    } else if (item.type === 'logoBug') {
      const text = find('bug-text') as TextBlock | undefined;
      const badge = find('bug') as Rectangle | undefined;
      if (text) text.text = item.logoText ?? '';
      if (badge) badge.color = item.accentColor;
    }
    this.applyFont(lg);
  }

  /** Drive position/opacity each frame from the animation state. */
  private applyAnim(lg: LiveGraphic) {
    const { item, root } = lg;
    // For 'in' we ease 0→1; for 'out' we go 1→0; 'on' stays at 1.
    const shown = lg.state === 'out' ? 1 - this.ease(lg.progress) : lg.state === 'in' ? this.ease(lg.progress) : 1;

    if (item.type === 'lowerThird') {
      const card = root.getDescendants(false).find((c) => c.name === `lt-card-${item.id}`) as Rectangle | undefined;
      if (card) {
        card.alpha = shown;
        // Slide up from below as it appears.
        const offset = (1 - shown) * 60;
        card.top = `${-120 + offset}px`;
        card.left = `${90 - (1 - shown) * 40}px`;
      }
    } else if (item.type === 'ticker') {
      const bar = root.getDescendants(false).find((c) => c.name === `tk-bar-${item.id}`) as Rectangle | undefined;
      if (bar) {
        bar.alpha = shown;
        bar.top = `${(1 - shown) * 64}px`;
      }
      // Continuous scroll while on.
      const text = lg.tickerText;
      if (text && lg.state !== 'idle') {
        const speed = item.tickerSpeed ?? 90;
        const cur = parseFloat(String(text.left)) || 1920;
        let next = cur - speed * (this.scene.getEngine().getDeltaTime() / 1000);
        const w = (text.widthInPixels || 600) + 200;
        if (next < -w) next = 1920; // wrap around
        text.left = `${next}px`;
      }
    } else if (item.type === 'logoBug') {
      const badge = root.getDescendants(false).find((c) => c.name === `bug-${item.id}`) as Rectangle | undefined;
      if (badge) badge.alpha = shown * (item.opacity ?? 0.85);
    }
  }
}

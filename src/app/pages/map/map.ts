import { Component, ElementRef, ViewEncapsulation, computed, effect, inject, input, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { I18nService } from '../../core/i18n.service';
import { AccessibilityService } from '../../core/accessibility.service';
import {
  ALL_DESTS, FLOORS, STACK, FloorId, GlobalDest, Route, Step, Zone,
  buildDirections, computeRoute,
} from './wayfinding';

const SVGNS = 'http://www.w3.org/2000/svg';

/* ── i18n — English / Spanish (Spanish drafted; pending official court review) ── */
const UI: Record<'en' | 'es', Record<string, string>> = {
  en: {
    title: 'Find Your Way',
    intro: 'Search or tap a destination. The full route is shown on the building at left; tap any floor to see its detail at right.',
    depts: 'Departments', services: 'Services', search: '🔍  Search…',
    elevator: 'Elevator', stairs: 'Stairs', building: 'Building', fullroute: 'full route',
    back: '← Back to Home', switchhint: 'tap building to switch',
    svc_jury: '⚖️ Jury Assembly', svc_clerk: '📋 Clerk Counter', svc_rest: '🚻 Restrooms',
    start: 'Start at the lobby kiosk. Walk forward into the main hallway.',
    turn_left: 'Turn left', turn_right: 'Turn right', turn_straight: 'Continue straight', at: 'at',
    take_elevator: 'Take the elevator to {floor}.', take_stairs: 'Take the stairs to {floor}.',
    arrive: 'Arrive at {dest}.', note_rest: 'Restrooms are available on every floor, near the elevators.',
    floor: 'Floor', basement: 'Basement', lobby: 'LOBBY', main_entrance: '🚪 Main Entrance', reset: 'Start Over',
    pickdest: 'You are at the Lobby. Search or tap a destination to see directions.',
  },
  es: {
    title: 'Encuentre su Camino',
    intro: 'Busque o toque un destino. La ruta completa se muestra en el edificio a la izquierda; toque cualquier piso para ver su detalle a la derecha.',
    depts: 'Departamentos', services: 'Servicios', search: '🔍  Buscar…',
    elevator: 'Ascensor', stairs: 'Escaleras', building: 'Edificio', fullroute: 'ruta completa',
    back: '← Volver al Inicio', switchhint: 'toque el edificio para cambiar',
    svc_jury: '⚖️ Sala de Jurados', svc_clerk: '📋 Mostrador del Secretario', svc_rest: '🚻 Baños',
    start: 'Comience en el quiosco del vestíbulo y avance hacia el pasillo principal.',
    turn_left: 'Gire a la izquierda', turn_right: 'Gire a la derecha', turn_straight: 'Siga recto', at: 'en',
    take_elevator: 'Tome el ascensor al {floor}.', take_stairs: 'Tome las escaleras al {floor}.',
    arrive: 'Llegue a {dest}.', note_rest: 'Los baños están disponibles en cada piso, cerca de los ascensores.',
    floor: 'Piso', basement: 'Sótano', lobby: 'VESTÍBULO', main_entrance: '🚪 Entrada Principal', reset: 'Reiniciar',
    pickdest: 'Usted está en el Vestíbulo. Busque o toque un destino para ver las indicaciones.',
  },
};

const PLACE_ES: Record<string, string> = {
  'Restrooms': 'Baños', 'Elevators': 'Ascensores', 'Stairs': 'Escaleras',
  'Clerk Counter': 'Mostrador del Secretario', 'Jury Assembly': 'Sala de Jurados',
  'Jury Assembly Room': 'Sala de Reunión de Jurados', 'Staff Area': 'Área de Personal',
  'Interview / Wait': 'Entrevista / Espera', 'Lobby': 'Vestíbulo',
  'the elevators': 'los ascensores', 'the restrooms': 'los baños', 'the stairs': 'las escaleras',
  'the Clerk Counter': 'el Mostrador del Secretario',
};

/* ── small SVG helpers ── */
type Iso = (px: number, py: number, lift?: number) => { x: number; y: number };

function el(tag: string, attrs: Record<string, string | number>, parent?: Element): SVGElement {
  const e = document.createElementNS(SVGNS, tag) as SVGElement;
  for (const k in attrs) e.setAttribute(k, String(attrs[k]));
  if (parent) parent.appendChild(e);
  return e;
}

function txt(parent: Element, x: number, y: number, s: string, fill: string, size: number, weight?: string): SVGElement {
  const t = el('text', { x, y, fill, 'font-size': size, 'text-anchor': 'middle', 'font-family': 'system-ui,sans-serif', 'font-weight': weight || '400' }, parent);
  t.textContent = s;
  return t;
}

function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) + amt, g = ((n >> 8) & 255) + amt, b = (n & 255) + amt;
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}

function makeIso(a: number, b: number, ox: number, oy: number): Iso {
  return (px, py, lift) => ({ x: ox + (px - py) * a, y: oy + (px + py) * b - (lift || 0) });
}

const isoDet = makeIso(0.62, 0.32, 380, 46); // detail view
const isoOv = makeIso(0.34, 0.13, 150, 70);  // flatter/smaller for stacking
const DET_SLAB = 24;
const OV_GAP = 132;                          // vertical separation between plates

function ovOffset(floorId: FloorId): number {
  return STACK.indexOf(floorId) * OV_GAP;
}

@Component({
  selector: 'app-map',
  imports: [RouterLink, MatSlideToggle],
  templateUrl: './map.html',
  styleUrl: './map.scss',
  encapsulation: ViewEncapsulation.None,
})
export class MapPage {
  private readonly i18n = inject(I18nService);
  private readonly a11y = inject(AccessibilityService);

  /* ── state ── */
  protected readonly query = signal('');
  protected readonly stairsMode = signal(false);
  protected readonly destKey = signal<string | null>(null);
  protected readonly selectedFloor = signal<FloorId>('1');
  protected readonly highlightKind = signal<string | null>(null);

  protected readonly currentDest = computed<GlobalDest | null>(
    () => ALL_DESTS.find((d) => d.key === this.destKey()) ?? null,
  );
  protected readonly route = computed<Route | null>(() => {
    const d = this.currentDest();
    return d ? computeRoute(d, this.stairsMode()) : null;
  });
  protected readonly steps = computed<Step[]>(() => {
    const r = this.route();
    return r ? buildDirections(r, this.highlightKind()) : [];
  });

  /* ── control button models ── */
  protected readonly deptButtons = ALL_DESTS
    .filter((d) => d.label.startsWith('Department '))
    .map((d) => ({ n: parseInt(d.label.split(' ')[1], 10), key: d.key, floor: d.floor }))
    .sort((a, b) => a.n - b.n);

  protected readonly svcButtons = [
    { tkey: 'svc_jury', key: '2:jury', hl: undefined as string | undefined, search: (UI.en['svc_jury'] + ' ' + UI.es['svc_jury']).toLowerCase() },
    { tkey: 'svc_clerk', key: '1:clerk', hl: undefined as string | undefined, search: (UI.en['svc_clerk'] + ' ' + UI.es['svc_clerk']).toLowerCase() },
    { tkey: 'svc_rest', key: '1:rest', hl: 'rest' as string | undefined, search: (UI.en['svc_rest'] + ' ' + UI.es['svc_rest']).toLowerCase() },
  ];

  private readonly ovSvg = viewChild<ElementRef<SVGSVGElement>>('ovSvg');
  private readonly detSvg = viewChild<ElementRef<SVGSVGElement>>('detSvg');

  /** Deep link: /map?dept=7 preselects a department (used by Case Lookup). */
  readonly dept = input<string | undefined>();

  constructor() {
    effect(() => {
      const q = this.dept();
      if (!q) return;
      const d = ALL_DESTS.find((x) => x.label === 'Department ' + parseInt(q, 10));
      if (d) this.selectDest(d.key);
    });

    effect(() => {
      const ov = this.ovSvg()?.nativeElement;
      const det = this.detSvg()?.nativeElement;
      if (!ov || !det) return;
      this.i18n.lang(); // re-render on language change (labels inside the SVGs)
      const route = this.route();
      const hl = this.highlightKind();
      this.renderOverview(ov, route, hl);
      this.renderDetail(det, this.selectedFloor(), route, hl);
    });

    // audio mode: read the full turn-by-turn directions whenever the route
    // changes (destination picked, stairs toggled, language switched)
    effect(() => {
      const r = this.route();
      if (!r || !this.a11y.audio()) return;
      const text =
        this.tr(r.dest.label) + ', ' + this.floorName(r.dest.floor) + '. ' +
        this.steps().map((s) => this.formatStep(s)).join(' ');
      this.a11y.speak(text);
    });
  }

  /* ── i18n helpers ── */
  protected t(k: string): string {
    const d = UI[this.i18n.lang()];
    return d[k] !== undefined ? d[k] : UI.en[k];
  }

  protected tr(s: string): string {
    if (this.i18n.lang() === 'en' || !s) return s;
    const m = s.match(/^Department (\d+)$/);
    if (m) return 'Departamento ' + m[1];
    return PLACE_ES[s] || s;
  }

  protected floorName(id: FloorId): string {
    return id === 'B' ? this.t('basement') : this.t('floor') + ' ' + id;
  }

  protected formatStep(s: Step): string {
    switch (s.type) {
      case 'start':
        return this.t('start');
      case 'turn': {
        let b = s.dir === 'left' ? this.t('turn_left') : s.dir === 'right' ? this.t('turn_right') : this.t('turn_straight');
        if (s.landmark) b += ' ' + this.t('at') + ' ' + this.tr(s.landmark);
        return b + '.';
      }
      case 'trans':
        return this.t(s.via === 'stair' ? 'take_stairs' : 'take_elevator').replace('{floor}', this.floorName(s.floor));
      case 'arrive':
        return this.t('arrive').replace('{dest}', this.tr(s.dest));
      case 'note':
        return this.t('note_rest');
    }
  }

  /* ── control handlers ── */
  protected searchValue(ev: Event): string {
    return (ev.target as HTMLInputElement).value.trim().toLowerCase();
  }

  protected hidden(label: string): boolean {
    const q = this.query();
    return !!q && !label.includes(q);
  }

  protected selectDest(key: string, hl?: string): void {
    this.highlightKind.set(hl ?? null);
    this.destKey.set(key);
    const dest = ALL_DESTS.find((d) => d.key === key);
    if (dest) this.selectedFloor.set(dest.floor); // jump detail to the destination floor
  }

  protected resetKiosk(): void {
    this.query.set('');
    this.stairsMode.set(false);
    this.destKey.set(null);
    this.highlightKind.set(null);
    this.selectedFloor.set('1');
    window.scrollTo(0, 0); // land back on the Lobby
  }

  /* ══════════════════════════════════════════════════════════════════════
     SVG rendering (imperative, ported 1:1 from the static map.html)
     ══════════════════════════════════════════════════════════════════════ */
  private drawIsoBox(svg: Element, iso: Iso, z: Zone, h: number, opts: { highlight?: boolean; label?: boolean; sw?: number } = {}): void {
    const c: [number, number][] = [[z.x, z.y], [z.x + z.w, z.y], [z.x + z.w, z.y + z.h], [z.x, z.y + z.h]];
    const top = c.map(([x, y]) => iso(x, y, h));
    const bot = c.map(([x, y]) => iso(x, y, 0));
    let base = z.kind === 'room' ? '#ffffff' : z.kind === 'clerk' ? '#efe7fb' : z.kind === 'jury' ? '#e8f0fa'
      : z.kind === 'elev' || z.kind === 'stair' ? '#cfe0f2' : z.kind === 'rest' ? '#e2f0e2' : '#eef1f5';
    let stroke = z.kind === 'room' ? '#214c76' : z.kind === 'clerk' ? '#7b5ea7' : z.kind === 'jury' ? '#214c76'
      : z.kind === 'rest' ? '#5a9a5a' : '#8a97a6';
    if (opts.highlight) {
      base = '#b7e4bd';
      stroke = '#1f8a3b';
    }
    const sw = opts.sw || 1.2;
    el('polygon', { points: `${top[1].x},${top[1].y} ${top[2].x},${top[2].y} ${bot[2].x},${bot[2].y} ${bot[1].x},${bot[1].y}`, fill: shade(base, -30) }, svg);
    el('polygon', { points: `${top[2].x},${top[2].y} ${top[3].x},${top[3].y} ${bot[3].x},${bot[3].y} ${bot[2].x},${bot[2].y}`, fill: shade(base, -16) }, svg);
    el('polygon', { points: top.map((p) => `${p.x},${p.y}`).join(' '), fill: base, stroke, 'stroke-width': sw }, svg);
    if (z.label && opts.label !== false) {
      const ctr = iso(z.x + z.w / 2, z.y + z.h / 2, h);
      txt(svg, ctr.x, ctr.y + 4, this.tr(z.label), stroke, 12, '700');
      if (z.kind === 'elev') txt(svg, ctr.x, ctr.y - 11, '⬆⬇', stroke, 13);
    }
  }

  private paintFloor(svg: Element, iso: Iso, x: number, y: number, w: number, h: number, fill: string): void {
    const c = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]].map(([px, py]) => iso(px, py, 0));
    el('polygon', { points: c.map((p) => `${p.x},${p.y}`).join(' '), fill, stroke: 'none' }, svg);
  }

  /* ── DETAIL view of one floor ── */
  private renderDetail(svg: SVGSVGElement, floorId: FloorId, route: Route | null, highlightKind: string | null): void {
    svg.innerHTML = '';
    const f = FLOORS[floorId];
    const iso = isoDet;
    const B = { x: 60, y: 70, w: 900, h: 490 };
    const corners: [number, number][] = [[B.x, B.y], [B.x + B.w, B.y], [B.x + B.w, B.y + B.h], [B.x, B.y + B.h]];
    const cTop = corners.map(([x, y]) => iso(x, y, 0));
    const cBot = corners.map(([x, y]) => iso(x, y, -DET_SLAB));
    el('polygon', { points: `${cTop[3].x},${cTop[3].y} ${cTop[0].x},${cTop[0].y} ${cBot[0].x},${cBot[0].y} ${cBot[3].x},${cBot[3].y}`, fill: '#0c1f30' }, svg);
    el('polygon', { points: `${cTop[2].x},${cTop[2].y} ${cTop[3].x},${cTop[3].y} ${cBot[3].x},${cBot[3].y} ${cBot[2].x},${cBot[2].y}`, fill: '#0a1826' }, svg);
    el('polygon', { points: cTop.map((p) => `${p.x},${p.y}`).join(' '), fill: '#dbe4ee', stroke: '#aab8c8', 'stroke-width': 1 }, svg);

    this.paintFloor(svg, iso, 135, 336, 565, 32, '#cfe0f2'); // hallway
    const lobby = f.zones.find((z) => z.kind === 'lobby');
    if (lobby) {
      this.paintFloor(svg, iso, lobby.x + 8, 336, lobby.w - 16, lobby.h, '#fdf1cf');
      const lc = iso(lobby.x + lobby.w / 2, lobby.y + lobby.h / 2, 0);
      txt(svg, lc.x, lc.y, this.t('lobby'), '#9a6b00', 12, '700');
      const ec = iso(lobby.x + lobby.w / 2, lobby.y + lobby.h + 15, 0);
      txt(svg, ec.x, ec.y, this.t('main_entrance'), '#9a6b00', 11);
    }

    [...f.zones].filter((z) => z.kind !== 'lobby')
      .sort((a, b) => ((a.x + a.w) + (a.y + a.h)) - ((b.x + b.w) + (b.y + b.h)))
      .forEach((z) => this.drawIsoBox(svg, iso, z,
        z.kind === 'room' ? 38 : z.kind === 'clerk' || z.kind === 'jury' || z.kind === 'staff' ? 32 : 20,
        { highlight: !!highlightKind && z.kind === highlightKind }));

    // route leg on this floor
    const leg = route?.legs.find((l) => l.floor === floorId);
    if (leg && leg.path.length > 1) {
      const poly = leg.path.map((k) => {
        const p = iso(f.nodes[k].x, f.nodes[k].y, 15);
        return `${p.x},${p.y}`;
      }).join(' ');
      el('polyline', { points: poly, class: 'route-line', stroke: '#000', 'stroke-width': 9, opacity: '.28' }, svg);
      el('polyline', { points: poly, class: 'route-line route-dash', stroke: '#ff8a4d', 'stroke-width': 6 }, svg);
    }
    // kiosk star (floor 1)
    if (floorId === '1') {
      const L = iso(f.nodes['L'].x, f.nodes['L'].y, 0);
      const g = el('g', { class: 'pulse' }, svg);
      el('line', { x1: L.x, y1: L.y, x2: L.x, y2: L.y - 48, stroke: '#ffc107', 'stroke-width': 3 }, g);
      el('circle', { cx: L.x, cy: L.y - 52, r: 11, fill: '#ffc107', stroke: '#fff', 'stroke-width': 2 }, g);
      txt(g, L.x, L.y - 48, '★', '#000', 11, '700');
    }
    // destination beacon (on dest floor)
    if (route && route.dest.floor === floorId) {
      const dn = f.nodes[route.dest.node];
      const d = iso(dn.x, dn.y, 0);
      // expanding "arrival ping" ring
      const ring = el('circle', { cx: d.x, cy: d.y - 48, r: 9, fill: 'none', stroke: '#f0642d', 'stroke-width': 3 }, svg);
      el('animate', { attributeName: 'r', values: '9;24', dur: '1.4s', repeatCount: 'indefinite' }, ring);
      el('animate', { attributeName: 'opacity', values: '0.9;0', dur: '1.4s', repeatCount: 'indefinite' }, ring);
      el('line', { x1: d.x, y1: d.y, x2: d.x, y2: d.y - 44, stroke: '#f0642d', 'stroke-width': 3 }, svg);
      el('circle', { cx: d.x, cy: d.y - 48, r: 9, fill: '#f0642d', stroke: '#fff', 'stroke-width': 2 }, svg);
    }
  }

  /* ── OVERVIEW: exploded stack of all floors ── */
  private renderOverview(svg: SVGSVGElement, route: Route | null, highlightKind: string | null): void {
    svg.innerHTML = '';
    const involved = new Set<FloorId>(route ? route.legs.map((l) => l.floor) : ['1']); // no route → highlight the Lobby floor

    // draw bottom→top so upper floors overlay
    [...STACK].reverse().forEach((floorId) => {
      const f = FLOORS[floorId];
      const off = ovOffset(floorId);
      const iso: Iso = (px, py, lift) => {
        const p = isoOv(px, py, lift);
        return { x: p.x, y: p.y + off };
      };
      const g = el('g', { class: 'ov-floor', 'data-floor': floorId }, svg);
      g.addEventListener('click', () => this.selectedFloor.set(floorId));

      const B = { x: 60, y: 70, w: 900, h: 490 };
      const c = ([[B.x, B.y], [B.x + B.w, B.y], [B.x + B.w, B.y + B.h], [B.x, B.y + B.h]] as [number, number][]).map(([x, y]) => iso(x, y, 0));
      const active = involved.has(floorId);
      g.setAttribute('opacity', String(highlightKind ? 1 : active ? 1 : 0.68));
      // plate
      el('polygon', {
        points: c.map((p) => `${p.x},${p.y}`).join(' '),
        fill: active ? '#e9f1fb' : '#dbe4ee',
        stroke: active ? '#f0642d' : '#9fb0c2',
        'stroke-width': active ? 2.5 : 1,
      }, g);
      // hallway hint
      this.paintFloor(g, iso, 135, 336, 565, 32, '#c6d8ec');
      // rooms as small extruded boxes (back→front, no labels)
      [...f.zones].filter((z) => z.kind !== 'lobby')
        .sort((a, b) => ((a.x + a.w) + (a.y + a.h)) - ((b.x + b.w) + (b.y + b.h)))
        .forEach((z) => this.drawIsoBox(g, iso, z,
          z.kind === 'room' ? 16 : z.kind === 'clerk' || z.kind === 'jury' || z.kind === 'staff' ? 12 : 8,
          { label: false, sw: 0.7, highlight: !!highlightKind && z.kind === highlightKind }));
      // floor label
      const lab = iso(60, 300, 0);
      txt(g, lab.x - 16, lab.y + 4, floorId === 'B' ? 'B' : floorId, active ? '#0b253e' : '#5a6b7d', 15, '800');

      // route leg on this floor
      const leg = route?.legs.find((l) => l.floor === floorId);
      if (leg && leg.path.length > 1) {
        const poly = leg.path.map((k) => {
          const p = iso(f.nodes[k].x, f.nodes[k].y, 10);
          return `${p.x},${p.y}`;
        }).join(' ');
        el('polyline', { points: poly, class: 'route-line', stroke: '#000', 'stroke-width': 6, opacity: '.25' }, g);
        el('polyline', { points: poly, class: 'route-line route-dash', stroke: '#ff8a4d', 'stroke-width': 4 }, g);
      }
      // kiosk star on floor 1
      if (floorId === '1') {
        const L = iso(f.nodes['L'].x, f.nodes['L'].y, 0);
        el('circle', { cx: L.x, cy: L.y, r: 8, fill: '#ffc107', stroke: '#fff', 'stroke-width': 2 }, g);
        txt(g, L.x, L.y + 3.5, '★', '#000', 9, '700');
      }
      // dest beacon
      if (route && route.dest.floor === floorId) {
        const dn = f.nodes[route.dest.node];
        const d = iso(dn.x, dn.y, 0);
        el('circle', { cx: d.x, cy: d.y, r: 8, fill: '#f0642d', stroke: '#fff', 'stroke-width': 2 }, g);
      }
    });

    // vertical elevator/stairs shaft between involved floors
    if (route && route.legs.length > 1) {
      const via = route.via;
      const topFloor = route.dest.floor;
      const botFloor: FloorId = '1';
      const node = via === 'stair' ? 'stair' : 'elev';
      const pT = isoOv(FLOORS[topFloor].nodes[node].x, FLOORS[topFloor].nodes[node].y, 0);
      const pTop = { x: pT.x, y: pT.y + ovOffset(topFloor) };
      const pB = isoOv(FLOORS[botFloor].nodes[node].x, FLOORS[botFloor].nodes[node].y, 0);
      const pBot = { x: pB.x, y: pB.y + ovOffset(botFloor) };
      el('line', { x1: pBot.x, y1: pBot.y, x2: pTop.x, y2: pTop.y, stroke: '#ff8a4d', 'stroke-width': 4, 'stroke-dasharray': '6 6', class: 'route-dash' }, svg);
      const midY = (pTop.y + pBot.y) / 2;
      txt(svg, pTop.x + 38, midY, via === 'stair' ? '🪜' : '🛗', '#ffd27a', 18);
    }
  }
}

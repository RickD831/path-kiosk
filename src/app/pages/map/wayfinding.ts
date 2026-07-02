/* ══════════════════════════════════════════════════════════════════════════
   Wayfinding model — floor graphs, Dijkstra routing, and direction steps.
   Ported 1:1 from the static app's map.html.

   Shared top-down coord space 0..1000 x, 0..600 y; the elevator shaft sits
   at the SAME footprint (395,420) on every floor.
   ══════════════════════════════════════════════════════════════════════════ */

export interface Zone {
  x: number;
  y: number;
  w: number;
  h: number;
  kind: 'room' | 'clerk' | 'jury' | 'staff' | 'elev' | 'stair' | 'rest' | 'lobby';
  label?: string;
}

export interface FloorNode {
  x: number;
  y: number;
  name: string;
}

export interface Dest {
  id: string;
  label: string;
  node: string;
}

export interface Floor {
  zones: Zone[];
  nodes: Record<string, FloorNode>;
  edges: [string, string][];
  dests: Dest[];
  adj: Record<string, [string, number][]>;
}

export interface GlobalDest extends Dest {
  floor: FloorId;
  key: string;
}

export type FloorId = '1' | '2' | '3' | 'B';
export type Via = 'elev' | 'stair';

export interface RouteLeg {
  floor: FloorId;
  path: string[];
}

export interface Route {
  legs: RouteLeg[];
  via: Via;
  dest: GlobalDest;
}

export type Step =
  | { type: 'start' }
  | { type: 'turn'; dir: 'left' | 'right' | 'straight'; landmark: string | null }
  | { type: 'trans'; via: Via; floor: FloorId }
  | { type: 'arrive'; dest: string }
  | { type: 'note' };

function dist(p: FloorNode, q: FloorNode): number {
  return Math.hypot(p.x - q.x, p.y - q.y);
}

/* ── Shared positions ── */
const CRX = [160, 300, 440]; // 3 back courtrooms
const CRW = 120;
const CRH = 190;
const CRY = 110;
const CRCX = [220, 360, 500]; // their centers / hall access x
const HY = 352; // hallway spine y
const ELEV = { x: 350, y: 420, w: 90, h: 80 };
const REST = { x: 180, y: 420, w: 150, h: 95 };
const STAIR = { x: 640, y: 420, w: 70, h: 80 };

interface RightFeature {
  id?: string;
  label?: string;
  node?: FloorNode;
  zone: Zone;
}

function makeStandardFloor(rooms: string[], rightFeature: RightFeature | null, hasLobby: boolean): Floor {
  const zones: Zone[] = [];
  const nodes: Record<string, FloorNode> = {};
  const edges: [string, string][] = [];
  const dests: Dest[] = [];

  // courtrooms
  rooms.forEach((n, i) => {
    zones.push({ x: CRX[i], y: CRY, w: CRW, h: CRH, kind: 'room', label: 'Department ' + n });
    nodes['cr' + n] = { x: CRCX[i], y: 300, name: 'Department ' + n };
  });
  // bottom zone
  zones.push({ ...REST, kind: 'rest', label: 'Restrooms' });
  zones.push({ ...ELEV, kind: 'elev', label: 'Elevators' });
  zones.push({ ...STAIR, kind: 'stair', label: 'Stairs' });
  // hallway nodes
  Object.assign(nodes, {
    hL: { x: 150, y: HY, name: '' },
    hA: { x: CRCX[0], y: HY, name: '' },
    hB: { x: CRCX[1], y: HY, name: '' },
    hE: { x: 395, y: HY, name: '' },
    hC: { x: CRCX[2], y: HY, name: '' },
    hR: { x: 600, y: HY, name: '' },
    hR2: { x: 700, y: HY, name: '' },
    elev: { x: 395, y: 420, name: 'the elevators' },
    rest: { x: 255, y: 420, name: 'the restrooms' },
    stair: { x: 675, y: 420, name: 'the stairs' },
  });
  edges.push(
    ['hL', 'hA'], ['hA', 'hB'], ['hB', 'hE'], ['hE', 'hC'], ['hR', 'hR2'],
    ['hA', 'cr' + rooms[0]], ['hB', 'cr' + rooms[1]], ['hC', 'cr' + rooms[2]],
    ['hE', 'elev'], ['hA', 'rest'], ['hR', 'stair'],
  );
  if (hasLobby) {
    nodes['L'] = { x: 545, y: 500, name: 'Lobby (You are here)' };
    nodes['lobHall'] = { x: 545, y: HY, name: '' };
    zones.push({ x: 470, y: 395, w: 150, h: 150, kind: 'lobby', label: 'Lobby' });
    edges.push(['L', 'lobHall'], ['hC', 'lobHall'], ['lobHall', 'hR']);
  } else {
    edges.push(['hC', 'hR']);
  }
  // right feature
  if (rightFeature) {
    zones.push(rightFeature.zone);
    if (rightFeature.node && rightFeature.id) {
      nodes[rightFeature.id] = rightFeature.node;
      edges.push(['hR2', rightFeature.id]);
    }
  }
  dests.push(...rooms.map((n) => ({ id: 'cr' + n, label: 'Department ' + n, node: 'cr' + n })));
  dests.push(
    { id: 'rest', label: 'Restrooms', node: 'rest' },
    { id: 'elev', label: 'Elevators', node: 'elev' },
    { id: 'stair', label: 'Stairs', node: 'stair' },
  );
  if (rightFeature?.node && rightFeature.id && rightFeature.label) {
    dests.push({ id: rightFeature.id, label: rightFeature.label, node: rightFeature.id });
  }
  return { zones, nodes, edges, dests, adj: {} };
}

function makeBasement(): Floor {
  const zones: Zone[] = [];
  const nodes: Record<string, FloorNode> = {};
  const edges: [string, string][] = [];
  const dests: Dest[] = [];

  zones.push({ x: 230, y: 110, w: 150, h: 200, kind: 'room', label: 'Department 10' });
  zones.push({ x: 450, y: 110, w: 170, h: 200, kind: 'room', label: 'Department 11' });
  zones.push({ x: 660, y: 150, w: 150, h: 140, kind: 'clerk', label: 'Interview / Wait' });
  zones.push({ x: 700, y: 420, w: 150, h: 95, kind: 'rest', label: 'Restrooms' });
  zones.push({ ...ELEV, kind: 'elev', label: 'Elevators' });
  zones.push({ x: 120, y: 430, w: 70, h: 90, kind: 'stair', label: 'Stairs' });
  Object.assign(nodes, {
    hL: { x: 170, y: HY, name: '' },
    h10: { x: 305, y: HY, name: '' },
    hE: { x: 395, y: HY, name: '' },
    h11: { x: 535, y: HY, name: '' },
    hR: { x: 660, y: HY, name: '' },
    cr10: { x: 305, y: 305, name: 'Department 10' },
    cr11: { x: 535, y: 305, name: 'Department 11' },
    elev: { x: 395, y: 420, name: 'the elevators' },
    rest: { x: 760, y: 420, name: 'the restrooms' },
    stair: { x: 155, y: 430, name: 'the stairs' },
  });
  edges.push(
    ['hL', 'h10'], ['h10', 'hE'], ['hE', 'h11'], ['h11', 'hR'],
    ['h10', 'cr10'], ['h11', 'cr11'], ['hE', 'elev'], ['hR', 'rest'], ['hL', 'stair'],
  );
  dests.push(
    { id: 'cr10', label: 'Department 10', node: 'cr10' },
    { id: 'cr11', label: 'Department 11', node: 'cr11' },
    { id: 'rest', label: 'Restrooms', node: 'rest' },
    { id: 'elev', label: 'Elevators', node: 'elev' },
  );
  return { zones, nodes, edges, dests, adj: {} };
}

export const FLOORS: Record<FloorId, Floor> = {
  '3': makeStandardFloor(['1', '2', '3'], { zone: { x: 760, y: 110, w: 180, h: 300, kind: 'staff', label: 'Staff Area' } }, false),
  '2': makeStandardFloor(['4', '5', '6'], {
    id: 'jury', label: 'Jury Assembly',
    node: { x: 815, y: 250, name: 'Jury Assembly Room' },
    zone: { x: 720, y: 110, w: 220, h: 320, kind: 'jury', label: 'Jury Assembly' },
  }, false),
  '1': makeStandardFloor(['7', '8', '9'], {
    id: 'clerk', label: 'Clerk Counter',
    node: { x: 820, y: 430, name: 'the Clerk Counter' },
    zone: { x: 760, y: 360, w: 170, h: 150, kind: 'clerk', label: 'Clerk Counter' },
  }, true),
  'B': makeBasement(),
};

export const STACK: FloorId[] = ['3', '2', '1', 'B']; // top → bottom

// build adjacency per floor
for (const id of Object.keys(FLOORS) as FloorId[]) {
  const f = FLOORS[id];
  Object.keys(f.nodes).forEach((k) => (f.adj[k] = []));
  f.edges.forEach(([a, b]) => {
    const d = dist(f.nodes[a], f.nodes[b]);
    f.adj[a].push([b, d]);
    f.adj[b].push([a, d]);
  });
}

export function dijkstra(floorId: FloorId, start: string, goal: string): string[] {
  const f = FLOORS[floorId];
  const D: Record<string, number> = {};
  const prev: Record<string, string> = {};
  const Q = new Set(Object.keys(f.nodes));
  Object.keys(f.nodes).forEach((k) => (D[k] = Infinity));
  D[start] = 0;
  while (Q.size) {
    let u: string | null = null;
    let best = Infinity;
    Q.forEach((k) => {
      if (D[k] < best) {
        best = D[k];
        u = k;
      }
    });
    if (u === null) break;
    Q.delete(u);
    if (u === goal) break;
    for (const [v, w] of f.adj[u]) {
      if (D[u] + w < D[v]) {
        D[v] = D[u] + w;
        prev[v] = u;
      }
    }
  }
  const path: string[] = [];
  let c: string | undefined = goal;
  while (c !== undefined) {
    path.unshift(c);
    c = prev[c];
  }
  return path[0] === start ? path : [];
}

/* ── Global destination list (across floors) ── */
export const ALL_DESTS: GlobalDest[] = [];
(['1', '2', '3', 'B'] as FloorId[]).forEach((fid) =>
  FLOORS[fid].dests.forEach((d) => {
    if (d.id === 'elev' || d.id === 'stair') return; // don't list vertical transports as targets
    ALL_DESTS.push({ ...d, floor: fid, key: fid + ':' + d.id });
  }),
);

/* ── Route (may span two floors; every route starts at the Floor 1 lobby kiosk) ── */
export function computeRoute(dest: GlobalDest, stairsMode: boolean): Route {
  const via: Via = stairsMode ? 'stair' : 'elev';
  if (dest.floor === '1') {
    return { legs: [{ floor: '1', path: dijkstra('1', 'L', dest.node) }], via, dest };
  }
  return {
    legs: [
      { floor: '1', path: dijkstra('1', 'L', via) },
      { floor: dest.floor, path: dijkstra(dest.floor, via, dest.node) },
    ],
    via,
    dest,
  };
}

/* ── Turn-by-turn steps (language-independent; formatted by the component) ── */
function bearing(a: FloorNode, b: FloorNode): number {
  return (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
}

function classifyTurn(b1: number, b2: number): 'left' | 'right' | 'straight' {
  let d = b2 - b1;
  while (d > 180) d -= 360;
  while (d < -180) d += 360;
  if (Math.abs(d) < 25) return 'straight';
  return d > 0 ? 'right' : 'left';
}

function legTurns(floorId: FloorId, path: string[]): Step[] {
  const f = FLOORS[floorId];
  const P = path.map((k) => f.nodes[k]);
  const out: Step[] = [];
  for (let i = 1; i < P.length - 1; i++) {
    const turn = classifyTurn(bearing(P[i - 1], P[i]), bearing(P[i], P[i + 1]));
    const name = f.nodes[path[i]].name;
    if (turn === 'straight' && !name) continue;
    out.push({ type: 'turn', dir: turn, landmark: name || null });
  }
  return out;
}

export function buildDirections(route: Route, highlightKind: string | null): Step[] {
  const steps: Step[] = [{ type: 'start' }];
  route.legs.forEach((leg, idx) => {
    steps.push(...legTurns(leg.floor, leg.path));
    if (idx < route.legs.length - 1) steps.push({ type: 'trans', via: route.via, floor: route.dest.floor });
  });
  steps.push({ type: 'arrive', dest: route.dest.label });
  if (highlightKind === 'rest') steps.push({ type: 'note' });
  return steps;
}

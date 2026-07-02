import { Component, computed, effect, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { Dict, I18nService } from '../../core/i18n.service';

/* ── Seeded fake hearing data (POC placeholder) ──────────────────────────────
   The department number seeds a PRNG so each department always shows the same
   consistent (but fictional) schedule.
   To wire up real data: replace `generateRows()` with an HttpClient call to
   the court's calendar API — the row model and table below already match. */

const FIRST_NAMES = ['James', 'Maria', 'Robert', 'Linda', 'Michael', 'Patricia', 'David', 'Barbara', 'John', 'Jennifer', 'Carlos', 'Susan', 'William', 'Dorothy', 'Richard', 'Sandra'];
const LAST_NAMES = ['Garcia', 'Smith', 'Johnson', 'Martinez', 'Williams', 'Brown', 'Jones', 'Davis', 'Miller', 'Wilson', 'Moore', 'Taylor', 'Anderson', 'Thomas', 'Jackson', 'White'];
const FIRMS = ['Harmon & Associates', 'Public Defender', 'District Attorney', 'Levy Law Group', 'Coast Legal Partners', 'Pro Per', 'Martinez Legal', 'Nguyen & Kim LLP', 'DA Office', 'PD Office'];

const HEARING_TYPES = [
  { key: 'Trial', cls: 'type-trial' },
  { key: 'Motion', cls: 'type-motion' },
  { key: 'Arraignment', cls: 'type-arraign' },
  { key: 'Sentencing', cls: 'type-sentenc' },
  { key: 'Status', cls: 'type-status' },
  { key: 'Prelim', cls: 'type-prelim' },
] as const;

const STATUSES = [
  { key: 'Scheduled', cls: 'status-scheduled' },
  { key: 'Scheduled', cls: 'status-scheduled' },
  { key: 'Scheduled', cls: 'status-scheduled' },
  { key: 'Continued', cls: 'status-continued' },
  { key: 'Vacated', cls: 'status-vacated' },
] as const;

const TIME_SLOTS: { time: string; sec: 'Morning' | 'Afternoon' | null }[] = [
  { time: '8:30 AM', sec: 'Morning' },
  { time: '9:00 AM', sec: null },
  { time: '9:30 AM', sec: null },
  { time: '10:00 AM', sec: null },
  { time: '10:30 AM', sec: null },
  { time: '1:30 PM', sec: 'Afternoon' },
  { time: '2:00 PM', sec: null },
  { time: '2:30 PM', sec: null },
  { time: '3:00 PM', sec: null },
];

type CalRow =
  | { kind: 'section'; sec: 'Morning' | 'Afternoon' }
  | {
      kind: 'hearing';
      time: string;
      caseNum: string;
      plaintiff: string;
      defendant: string;
      typeKey: string;
      typeCls: string;
      statusKey: string;
      statusCls: string;
      atty1: string;
      atty2: string;
    };

function seeded(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return Math.abs(s) / 0xffffffff;
  };
}

function generateRows(dept: number): CalRow[] {
  const rand = seeded(dept * 7919);
  const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)];
  const caseNum = () => {
    const t = pick(['CR', 'CV', 'PR', 'FL', 'SC']);
    const yr = 2023 + Math.floor(rand() * 2);
    const num = String(Math.floor(rand() * 90000) + 10000);
    return `${yr}-${t}-${num}`;
  };

  const rows: CalRow[] = [];
  let lastSec: string | null = null;

  for (const slot of TIME_SLOTS) {
    if (rand() < 0.2) continue; // skip some slots for realism (deterministic)

    if (slot.sec && slot.sec !== lastSec) {
      lastSec = slot.sec;
      rows.push({ kind: 'section', sec: slot.sec });
    }

    const plaintiff = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
    const defendant = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
    const ht = pick(HEARING_TYPES);
    const st = pick(STATUSES);
    const atty1 = pick(FIRMS);
    const atty2 = rand() > 0.4 ? pick(FIRMS) : '—';

    rows.push({
      kind: 'hearing',
      time: slot.time,
      caseNum: caseNum(),
      plaintiff,
      defendant,
      typeKey: ht.key,
      typeCls: ht.cls,
      statusKey: st.key,
      statusCls: st.cls,
      atty1,
      atty2,
    });
  }
  return rows;
}

/* ── i18n ── */

interface CalStrings {
  h_time: string; h_case: string; h_parties: string; h_type: string; h_atty: string; h_status: string;
  types: Record<string, string>;
  statuses: Record<string, string>;
  sections: Record<string, string>;
  legend: { color: string; key: string }[];
  heading: string; calfor: string; vs: string; none: string; locale: string; back: string;
}

const LEGEND = [
  { color: '#a04000', key: 'Trial' },
  { color: '#0055a4', key: 'Motion' },
  { color: '#1a6b3a', key: 'Arraignment' },
  { color: '#5a1a8c', key: 'Sentencing' },
  { color: '#7a5800', key: 'Status' },
  { color: '#8c1a1a', key: 'Prelim' },
];

const STRINGS: Dict<CalStrings> = {
  en: {
    h_time: 'Time', h_case: 'Case Number', h_parties: 'Parties', h_type: 'Hearing Type', h_atty: 'Attorney(s)', h_status: 'Status',
    types: { Trial: 'Trial', Motion: 'Motion', Arraignment: 'Arraignment', Sentencing: 'Sentencing', Status: 'Status Conf.', Prelim: 'Prelim. Hrg' },
    statuses: { Scheduled: 'Scheduled', Continued: 'Continued', Vacated: 'Vacated' },
    sections: { Morning: 'Morning Session', Afternoon: 'Afternoon Session' },
    legend: LEGEND,
    heading: 'Department', calfor: 'Calendar for {d}', vs: 'vs.',
    none: 'No hearings scheduled for this department today.',
    locale: 'en-US', back: '← Back to Departments',
  },
  es: {
    h_time: 'Hora', h_case: 'Número de Caso', h_parties: 'Partes', h_type: 'Tipo de Audiencia', h_atty: 'Abogado(s)', h_status: 'Estado',
    types: { Trial: 'Juicio', Motion: 'Moción', Arraignment: 'Lectura de Cargos', Sentencing: 'Sentencia', Status: 'Conf. de Estado', Prelim: 'Aud. Preliminar' },
    statuses: { Scheduled: 'Programado', Continued: 'Aplazado', Vacated: 'Anulado' },
    sections: { Morning: 'Sesión de la Mañana', Afternoon: 'Sesión de la Tarde' },
    legend: LEGEND,
    heading: 'Departamento', calfor: 'Calendario para el {d}', vs: 'contra',
    none: 'No hay audiencias programadas para este departamento hoy.',
    locale: 'es-ES', back: '← Volver a Departamentos',
  },
};

@Component({
  selector: 'app-calendar',
  imports: [RouterLink],
  templateUrl: './calendar.html',
  styleUrl: './calendar.scss',
})
export class Calendar {
  private readonly i18n = inject(I18nService);
  private readonly titleService = inject(Title);

  /** Route param (withComponentInputBinding). */
  readonly dept = input<string>('1');

  protected readonly s = computed(() => this.i18n.pick(STRINGS));
  protected readonly deptNum = computed(() => parseInt(this.dept(), 10) || 1);
  protected readonly rows = computed(() => generateRows(this.deptNum()));
  protected readonly hasHearings = computed(() => this.rows().some((r) => r.kind === 'hearing'));
  protected readonly dateLine = computed(() => {
    const d = this.s();
    const dateStr = new Date().toLocaleDateString(d.locale, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    return d.calfor.replace('{d}', dateStr);
  });

  constructor() {
    effect(() => {
      this.titleService.setTitle(`${this.s().heading} ${this.deptNum()} — PATH`);
    });
  }
}

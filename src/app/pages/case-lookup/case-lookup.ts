import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Dict, I18nService } from '../../core/i18n.service';
import { BoardHearing, CalendarBoardsService } from '../../core/calendar-boards.service';
import { ALL_DESTS } from '../map/wayfinding';

/* ── Case lookup — today's hearings only (read-only CalBoards data) ──────────
   One lobby-board fetch gives every hearing at this courthouse today; the
   visitor filters it by case number or last name on an on-screen keyboard
   (kiosks have no physical keyboard). Matches deep-link into the wayfinding
   map via /map?dept=N. */

interface LookupStrings {
  title: string;
  sub: string;
  placeholder: string;
  hint: string;
  loading: string;
  error: string;
  none: string;
  matches: string;
  dept: string;
  floor: string;
  floorB: string;
  time: string;
  showway: string;
  updated: string;
  refresh: string;
  clear: string;
  space: string;
  todayonly: string;
  back: string;
}

const STRINGS: Dict<LookupStrings> = {
  en: {
    title: 'Case Lookup',
    sub: "Find out where and when your case is being heard today.",
    placeholder: 'Case number or last name…',
    hint: 'Type at least 2 characters using the keyboard below.',
    loading: "Loading today's hearings…",
    error: 'The calendar is temporarily unavailable. Please ask at the Clerk Counter on Floor 1.',
    none: 'No hearings found today for',
    matches: 'hearing(s) found',
    dept: 'Department',
    floor: 'Floor',
    floorB: 'Basement',
    time: 'Time',
    showway: '🗺️ Show me the way',
    updated: 'Updated',
    refresh: '↻ Refresh',
    clear: 'Clear',
    space: 'Space',
    todayonly: "Today's hearings only. For other days or case records, ask at the Clerk Counter or visit the court website.",
    back: '← Back to Court Services',
  },
  es: {
    title: 'Búsqueda de Casos',
    sub: 'Averigüe dónde y cuándo se atiende su caso hoy.',
    placeholder: 'Número de caso o apellido…',
    hint: 'Escriba al menos 2 caracteres con el teclado de abajo.',
    loading: 'Cargando las audiencias de hoy…',
    error: 'El calendario no está disponible temporalmente. Pregunte en el Mostrador del Secretario en el Piso 1.',
    none: 'No se encontraron audiencias hoy para',
    matches: 'audiencia(s) encontrada(s)',
    dept: 'Departamento',
    floor: 'Piso',
    floorB: 'Sótano',
    time: 'Hora',
    showway: '🗺️ Muéstrame el camino',
    updated: 'Actualizado',
    refresh: '↻ Actualizar',
    clear: 'Borrar todo',
    space: 'Espacio',
    todayonly: 'Solo las audiencias de hoy. Para otros días o registros de casos, pregunte en el Mostrador del Secretario o visite el sitio web de la corte.',
    back: '← Volver a Servicios de la Corte',
  },
};

const KEY_ROWS = ['1234567890', 'QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];

@Component({
  selector: 'app-case-lookup',
  imports: [RouterLink],
  templateUrl: './case-lookup.html',
  styleUrl: './case-lookup.scss',
})
export class CaseLookup {
  private readonly i18n = inject(I18nService);
  protected readonly boards = inject(CalendarBoardsService);

  protected readonly s = computed(() => this.i18n.pick(STRINGS));
  protected readonly keyRows = KEY_ROWS;
  protected readonly query = signal('');

  protected readonly results = computed<BoardHearing[]>(() => {
    const q = this.query().trim().toUpperCase();
    const all = this.boards.lobby();
    if (q.length < 2 || !all) return [];
    return all
      .filter((h) => h.case.toUpperCase().includes(q) || h.name.toUpperCase().includes(q))
      .slice(0, 30);
  });

  protected readonly updatedAt = computed(() => {
    const at = this.boards.loadedAt();
    if (!at) return '';
    return at.toLocaleTimeString(this.i18n.lang() === 'es' ? 'es-ES' : 'en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  });

  constructor() {
    void this.boards.ensureLobby();
  }

  protected press(ch: string): void {
    if (this.query().length < 40) this.query.update((q) => q + ch);
  }

  protected backspace(): void {
    this.query.update((q) => q.slice(0, -1));
  }

  protected clear(): void {
    this.query.set('');
  }

  protected refresh(): void {
    void this.boards.ensureLobby(true);
  }

  /** Wayfinding destination for a hearing's department, if the map knows it. */
  protected deptNumber(h: BoardHearing): number | null {
    const n = parseInt(h.courtroom, 10);
    if (isNaN(n)) return null;
    return ALL_DESTS.some((d) => d.label === 'Department ' + n) ? n : null;
  }

  protected floorLabel(h: BoardHearing): string {
    return h.floor === 'B' ? this.s().floorB : `${this.s().floor} ${h.floor}`;
  }
}

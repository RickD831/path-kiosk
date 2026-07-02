import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Dict, I18nService } from '../../core/i18n.service';

interface CalendarsStrings {
  title: string;
  sub: string;
  f1: string;
  f2: string;
  f3: string;
  fb: string;
  back: string;
}

const STRINGS: Dict<CalendarsStrings> = {
  en: {
    title: 'Court Calendars',
    sub: "Select a department to view today's hearing schedule.",
    f1: 'Floor 1',
    f2: 'Floor 2',
    f3: 'Floor 3',
    fb: 'Basement',
    back: '← Back to Home',
  },
  es: {
    title: 'Calendarios de la Corte',
    sub: 'Seleccione un departamento para ver el calendario de audiencias de hoy.',
    f1: 'Piso 1',
    f2: 'Piso 2',
    f3: 'Piso 3',
    fb: 'Sótano',
    back: '← Volver al Inicio',
  },
};

// Department → floor-label key (1-3 on Floor 3, 4-6 on Floor 2, 7-9 on Floor 1, 10-11 Basement)
const DEPTS: { n: number; floor: keyof Pick<CalendarsStrings, 'f1' | 'f2' | 'f3' | 'fb'> }[] = [
  { n: 1, floor: 'f3' }, { n: 2, floor: 'f3' }, { n: 3, floor: 'f3' },
  { n: 4, floor: 'f2' }, { n: 5, floor: 'f2' }, { n: 6, floor: 'f2' },
  { n: 7, floor: 'f1' }, { n: 8, floor: 'f1' }, { n: 9, floor: 'f1' },
  { n: 10, floor: 'fb' }, { n: 11, floor: 'fb' },
];

@Component({
  selector: 'app-calendars',
  imports: [RouterLink],
  template: `
    <main class="page-body">
      <h1 class="page-title">{{ s().title }}</h1>
      <p class="page-subtitle">{{ s().sub }}</p>

      <div class="dept-grid">
        @for (d of depts; track d.n) {
          <a [routerLink]="['/calendar', d.n]" class="dept-card">
            <div class="dept-number">{{ d.n }}</div>
            <div class="dept-label">{{ s()[d.floor] }}</div>
          </a>
        }
      </div>
    </main>

    <a routerLink="/" class="back-btn">{{ s().back }}</a>
  `,
  styles: `
    :host {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .dept-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: 20px;
      width: 100%;
      max-width: 900px;
    }

    .dept-card {
      background: #fff;
      border: 2px solid var(--border);
      border-radius: 14px;
      padding: 32px 16px;
      text-align: center;
      text-decoration: none;
      color: var(--court-navy);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
    }

    .dept-card:hover {
      transform: translateY(-3px);
      box-shadow: 0 10px 28px rgba(33, 76, 118, 0.16);
      border-color: var(--court-gold);
      color: var(--court-navy);
    }

    .dept-card:active {
      transform: translateY(0);
    }

    .dept-number {
      font-size: 36px;
      font-weight: 700;
      color: var(--court-navy);
      line-height: 1;
    }

    .dept-label {
      font-size: 13px;
      color: var(--muted);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    :host-context(body.a11y-large) {
      .dept-number {
        font-size: 48px;
      }

      .dept-label {
        font-size: 17px;
      }
    }

    :host-context(body.a11y-contrast) .dept-card {
      border-width: 3px;
      border-color: #000;
    }
  `,
})
export class Calendars {
  private readonly i18n = inject(I18nService);
  protected readonly s = computed(() => this.i18n.pick(STRINGS));
  protected readonly depts = DEPTS;
}

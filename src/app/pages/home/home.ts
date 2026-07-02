import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Dict, I18nService } from '../../core/i18n.service';

interface HomeStrings {
  welcome: string;
  sub: string;
  svc: string;
  svc_d: string;
  cal: string;
  cal_d: string;
  map: string;
  map_d: string;
  web: string;
  web_d: string;
}

const STRINGS: Dict<HomeStrings> = {
  en: {
    welcome: 'Welcome',
    sub: 'Touch a tile below to get started.',
    svc: 'Court Services',
    svc_d: 'Order transcripts, court payments,<br>Jury Duty information &amp; more.',
    cal: 'Courtroom Finder',
    cal_d: 'Find out where and when your case<br>is being heard today.',
    map: 'Find Your Way',
    map_d: 'Interactive building map &amp;<br>floor-by-floor directory.',
    web: 'Court Website',
    web_d: 'Visit the official Superior Court<br>of Monterey County website.',
  },
  es: {
    welcome: 'Bienvenido',
    sub: 'Toque una opción para comenzar.',
    svc: 'Servicios de la Corte',
    svc_d: 'Solicite transcripciones, pagos de la corte,<br>información sobre el jurado y más.',
    cal: 'Buscador de Salas',
    cal_d: 'Averigüe dónde y cuándo<br>se atiende su caso hoy.',
    map: 'Encuentre su Camino',
    map_d: 'Mapa interactivo del edificio<br>y directorio por piso.',
    web: 'Sitio Web de la Corte',
    web_d: 'Visite el sitio web oficial de la Corte<br>Superior del Condado de Monterey.',
  },
};

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  template: `
    <main class="page-body">
      <h1 class="page-title">{{ s().welcome }}</h1>
      <p class="page-subtitle">{{ s().sub }}</p>

      <div class="kiosk-grid">
        <a routerLink="/services" class="kiosk-tile">
          <div class="tile-icon">⚖️</div>
          <div class="tile-label">{{ s().svc }}</div>
          <div class="tile-desc" [innerHTML]="s().svc_d"></div>
        </a>

        <a routerLink="/courtroom-finder" class="kiosk-tile">
          <div class="tile-icon">🔍</div>
          <div class="tile-label">{{ s().cal }}</div>
          <div class="tile-desc" [innerHTML]="s().cal_d"></div>
        </a>

        <a routerLink="/map" class="kiosk-tile">
          <div class="tile-icon">🗺️</div>
          <div class="tile-label">{{ s().map }}</div>
          <div class="tile-desc" [innerHTML]="s().map_d"></div>
        </a>

        <a href="https://www.monterey.courts.ca.gov" target="_blank" class="kiosk-tile">
          <div class="tile-icon">🌐</div>
          <div class="tile-label">{{ s().web }}</div>
          <div class="tile-desc" [innerHTML]="s().web_d"></div>
        </a>
      </div>
    </main>
  `,
  styles: `
    :host {
      flex: 1;
      display: flex;
      flex-direction: column;
    }
  `,
})
export class Home {
  private readonly i18n = inject(I18nService);
  protected readonly s = computed(() => this.i18n.pick(STRINGS));
}

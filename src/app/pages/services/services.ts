import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Dict, I18nService } from '../../core/i18n.service';

interface ServiceCard {
  icon: string;
  url?: string;    // external site (opens in a new tab)
  route?: string;  // in-app page
  phone?: boolean; // QR info page — show the "use your phone" badge
  label: string;
  desc: string;
}

interface ServicesStrings {
  title: string;
  sub: string;
  soon: string;
  phone: string;
  back: string;
  cards: ServiceCard[];
}

// Transactional services (payments, orders) never open on the public kiosk —
// they route to /service/:id, which shows a QR code + URL for the visitor's
// own phone. Neither url nor route → coming soon.
const CARD_LINKS: Partial<ServiceCard>[] = [
  { route: '/service/audio', phone: true },
  { route: '/case-lookup' }, // in-kiosk: today's hearings via the calendar boards API
  { url: 'https://www.monterey.courts.ca.gov/divisions/jury-services' },
  { route: '/service/payments', phone: true },
  {}, // Self-Help Center — coming soon
  {}, // Court Records Request — coming soon
];
const CARD_ICONS = ['🎙️', '🔍', '🏛️', '💳', '📋', '🗂️'];

function cards(labels: [string, string][]): ServiceCard[] {
  return labels.map(([label, desc], i) => ({ icon: CARD_ICONS[i], ...CARD_LINKS[i], label, desc }));
}

const STRINGS: Dict<ServicesStrings> = {
  en: {
    title: 'Court Services',
    sub: 'Select a service below. You will be directed to the appropriate site.',
    soon: 'Coming Soon',
    phone: '📱 Use your phone',
    back: '← Back to Home',
    cards: cards([
      ['Audio Recordings & Transcripts', 'Order official audio recordings and transcripts of court proceedings.'],
      ['Case Lookup', 'Find out where and when your case is being heard today.'],
      ['Jury Duty', 'Check your jury summons status, request postponements, or report for service.'],
      ['Online Court Payments', 'Pay fines, fees, and other court-related charges securely online.'],
      ['Self-Help Center', 'Access court forms, instructions, and resources for self-represented litigants.'],
      ['Court Records Request', 'Submit a request for certified court documents and official records.'],
    ]),
  },
  es: {
    title: 'Servicios de la Corte',
    sub: 'Seleccione un servicio. Se le dirigirá al sitio correspondiente.',
    soon: 'Próximamente',
    phone: '📱 Use su teléfono',
    back: '← Volver al Inicio',
    cards: cards([
      ['Grabaciones de Audio y Transcripciones', 'Solicite grabaciones de audio y transcripciones oficiales de los procedimientos judiciales.'],
      ['Búsqueda de Casos', 'Averigüe dónde y cuándo se atiende su caso hoy.'],
      ['Servicio de Jurado', 'Verifique el estado de su citación de jurado, solicite aplazamientos o preséntese para servir.'],
      ['Pagos en Línea de la Corte', 'Pague multas, tarifas y otros cargos judiciales de forma segura en línea.'],
      ['Centro de Autoayuda', 'Acceda a formularios, instrucciones y recursos judiciales para personas que se representan a sí mismas.'],
      ['Solicitud de Registros Judiciales', 'Envíe una solicitud de documentos judiciales certificados y registros oficiales.'],
    ]),
  },
};

@Component({
  selector: 'app-services',
  imports: [RouterLink],
  template: `
    <main class="page-body">
      <h1 class="page-title">{{ s().title }}</h1>
      <p class="page-subtitle">{{ s().sub }}</p>

      <div class="services-grid">
        @for (card of s().cards; track card.label) {
          @if (card.url) {
            <a [href]="card.url" target="_blank" class="service-card">
              <div class="svc-icon">{{ card.icon }}</div>
              <div class="svc-label">{{ card.label }}</div>
              <div class="svc-desc">{{ card.desc }}</div>
            </a>
          } @else if (card.route) {
            <a [routerLink]="card.route" class="service-card">
              <div class="svc-icon">{{ card.icon }}</div>
              <div class="svc-label">{{ card.label }}</div>
              <div class="svc-desc">{{ card.desc }}</div>
              @if (card.phone) {
                <span class="phone-badge">{{ s().phone }}</span>
              }
            </a>
          } @else {
            <div class="service-card coming-soon">
              <div class="svc-icon">{{ card.icon }}</div>
              <div class="svc-label">{{ card.label }}</div>
              <div class="svc-desc">{{ card.desc }}</div>
              <span class="coming-soon-badge">{{ s().soon }}</span>
            </div>
          }
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

    .phone-badge {
      background: #eaf3fb;
      color: var(--court-navy);
      border: 1.5px solid var(--court-blue-info);
      font-size: 12px;
      font-weight: 700;
      padding: 4px 14px;
      border-radius: 20px;
      letter-spacing: 0.3px;
    }

    :host-context(body.a11y-large) .phone-badge {
      font-size: 15px;
    }

    :host-context(body.a11y-contrast) .phone-badge {
      background: #fff;
      color: #000;
      border: 2px solid #000;
    }
  `,
})
export class Services {
  private readonly i18n = inject(I18nService);
  protected readonly s = computed(() => this.i18n.pick(STRINGS));
}

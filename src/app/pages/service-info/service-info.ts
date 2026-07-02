import { Component, ElementRef, computed, effect, inject, input, viewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import QRCode from 'qrcode';
import { Dict, I18nService } from '../../core/i18n.service';

/* ── Services that must NOT be used on the public kiosk ─────────────────────
   Instead of opening the external site, the kiosk shows basic information,
   a QR code, and the plain (non-clickable) URL so the visitor completes the
   action privately on their own phone. */

interface ServiceInfo {
  icon: string;
  url: string;
  s: Dict<{ label: string; desc: string }>;
}

const INFO: Record<string, ServiceInfo> = {
  payments: {
    icon: '💳',
    url: 'https://monterey.epay-it.com/en/',
    s: {
      en: {
        label: 'Online Court Payments',
        desc: 'Pay fines, fees, and other court-related charges securely online with a credit or debit card.',
      },
      es: {
        label: 'Pagos en Línea de la Corte',
        desc: 'Pague multas, tarifas y otros cargos judiciales de forma segura en línea con tarjeta de crédito o débito.',
      },
    },
  },
  audio: {
    icon: '🎙️',
    url: 'https://fortherecord.com/participating-courts/monterey/',
    s: {
      en: {
        label: 'Audio Recordings & Transcripts',
        desc: 'Order official audio recordings and transcripts of court proceedings. Orders are placed and paid for online.',
      },
      es: {
        label: 'Grabaciones de Audio y Transcripciones',
        desc: 'Solicite grabaciones de audio y transcripciones oficiales de los procedimientos judiciales. Los pedidos se realizan y pagan en línea.',
      },
    },
  },
};

const STRINGS: Dict<{
  privacy: string;
  how: string;
  step1: string;
  step2: string;
  step3: string;
  orType: string;
  back: string;
}> = {
  en: {
    privacy: 'For your privacy and security, this service is not available on this public kiosk. Please use your own phone — it only takes a minute.',
    how: 'How to continue on your phone',
    step1: 'Open the camera on your phone.',
    step2: 'Point it at the QR code below.',
    step3: 'Tap the link that appears to open the site on your phone.',
    orType: 'Or type this address into your phone or home computer:',
    back: '← Back to Court Services',
  },
  es: {
    privacy: 'Para su privacidad y seguridad, este servicio no está disponible en este quiosco público. Utilice su propio teléfono — solo toma un minuto.',
    how: 'Cómo continuar en su teléfono',
    step1: 'Abra la cámara de su teléfono.',
    step2: 'Apúntela al código QR de abajo.',
    step3: 'Toque el enlace que aparece para abrir el sitio en su teléfono.',
    orType: 'O escriba esta dirección en su teléfono o computadora:',
    back: '← Volver a Servicios de la Corte',
  },
};

@Component({
  selector: 'app-service-info',
  imports: [RouterLink],
  template: `
    @if (info(); as inf) {
      <main class="page-body">
        <div class="info-card">
          <div class="svc-icon">{{ inf.icon }}</div>
          <h1 class="page-title">{{ i18n.pick(inf.s).label }}</h1>
          <p class="svc-desc">{{ i18n.pick(inf.s).desc }}</p>

          <p class="privacy-note">🔒 {{ s().privacy }}</p>

          <div class="how-row">
            <div class="qr-box">
              <canvas #qr></canvas>
            </div>
            <div class="steps">
              <h2>📱 {{ s().how }}</h2>
              <ol>
                <li>{{ s().step1 }}</li>
                <li>{{ s().step2 }}</li>
                <li>{{ s().step3 }}</li>
              </ol>
            </div>
          </div>

          <p class="or-type">{{ s().orType }}</p>
          <p class="url-text" aria-label="website address">{{ inf.url }}</p>
        </div>
      </main>
    }

    <a routerLink="/services" class="back-btn">{{ s().back }}</a>
  `,
  styles: `
    :host {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .info-card {
      background: #fff;
      border: 2px solid var(--border);
      border-radius: 16px;
      padding: 36px 48px;
      max-width: 760px;
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      text-align: center;
    }

    .svc-icon {
      font-size: 56px;
      line-height: 1;
    }

    .svc-desc {
      font-size: 15px;
      color: var(--muted);
      margin: 0;
      max-width: 540px;
    }

    .privacy-note {
      background: #fff8e6;
      border-left: 4px solid var(--court-gold);
      border-radius: 0 8px 8px 0;
      padding: 12px 16px;
      font-size: 14.5px;
      font-weight: 600;
      color: #5a4100;
      margin: 10px 0 6px;
      max-width: 560px;
      text-align: left;
    }

    .how-row {
      display: flex;
      align-items: center;
      gap: 32px;
      margin: 12px 0 4px;
      flex-wrap: wrap;
      justify-content: center;
    }

    .qr-box {
      background: #fff;
      border: 2px solid var(--court-navy);
      border-radius: 12px;
      padding: 10px;
      line-height: 0;
    }

    .steps {
      text-align: left;
      max-width: 300px;
    }

    .steps h2 {
      font-size: 16px;
      font-weight: 800;
      color: var(--court-navy);
      margin: 0 0 8px;
    }

    .steps ol {
      margin: 0;
      padding-left: 20px;
      font-size: 14.5px;
      color: var(--text);
    }

    .steps li {
      margin: 6px 0;
    }

    .or-type {
      font-size: 13px;
      color: var(--muted);
      margin: 8px 0 0;
    }

    /* deliberately plain text — not a link; visitors shouldn't browse here */
    .url-text {
      font-family: SFMono-Regular, Consolas, 'Liberation Mono', monospace;
      font-size: 16px;
      font-weight: 700;
      color: var(--court-navy);
      background: #f0f2f5;
      border-radius: 8px;
      padding: 10px 18px;
      margin: 0;
      user-select: none;
    }

    :host-context(body.a11y-large) {
      .svc-desc { font-size: 19px; max-width: 640px; }
      .privacy-note { font-size: 18px; max-width: 640px; }
      .steps h2 { font-size: 20px; }
      .steps ol { font-size: 18px; }
      .or-type { font-size: 16px; }
      .url-text { font-size: 19px; }
    }

    :host-context(body.a11y-contrast) {
      .info-card { border: 3px solid #000; }
      .privacy-note { background: #fff; border: 2px solid #5a4100; border-left-width: 6px; color: #3d2c00; }
      .qr-box { border-color: #000; }
      .url-text { background: #fff; outline: 2px solid #000; color: #000; }
    }
  `,
})
export class ServiceInfoPage {
  protected readonly i18n = inject(I18nService);
  private readonly router = inject(Router);

  /** Route param (withComponentInputBinding). */
  readonly id = input.required<string>();

  protected readonly info = computed(() => INFO[this.id()] ?? null);
  protected readonly s = computed(() => this.i18n.pick(STRINGS));

  private readonly qr = viewChild<ElementRef<HTMLCanvasElement>>('qr');

  constructor() {
    effect(() => {
      const inf = this.info();
      if (!inf) {
        this.router.navigateByUrl('/services');
        return;
      }
      const canvas = this.qr()?.nativeElement;
      if (canvas) {
        QRCode.toCanvas(canvas, inf.url, {
          width: 240,
          margin: 1,
          color: { dark: '#0b253e', light: '#ffffff' },
        });
      }
    });
  }
}

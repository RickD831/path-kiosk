import { Injectable, effect, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { Dict, I18nService } from './i18n.service';

/* ── Spoken feedback strings ── */
const SPOKEN: Dict<Record<string, string>> = {
  en: {
    large_on: 'Large text on.',
    large_off: 'Large text off.',
    contrast_on: 'High contrast on.',
    contrast_off: 'High contrast off.',
    audio_on: 'Audio assistance on. Screens and directions will be read aloud.',
    audio_off: 'Audio assistance off.',
  },
  es: {
    large_on: 'Texto grande activado.',
    large_off: 'Texto grande desactivado.',
    contrast_on: 'Alto contraste activado.',
    contrast_off: 'Alto contraste desactivado.',
    audio_on: 'Asistencia de audio activada. Las pantallas y las indicaciones se leerán en voz alta.',
    audio_off: 'Asistencia de audio desactivada.',
  },
};

/* Page announcements, keyed by the first URL segment. */
const PAGES: Dict<Record<string, string>> = {
  en: {
    '': 'Welcome. Touch a tile to get started.',
    services: 'Court Services. Select a service.',
    calendars: 'Court Calendars. Select a department to view its schedule.',
    calendar: 'Department {n} calendar.',
    map: 'Find Your Way. Search or tap a destination to see directions.',
    service: 'To use this service, scan the QR code with your own phone. It is not available on this kiosk.',
    'courtroom-finder': 'Courtroom Finder. Type a case number or last name to find where your case is being heard today.',
  },
  es: {
    '': 'Bienvenido. Toque una opción para comenzar.',
    services: 'Servicios de la Corte. Seleccione un servicio.',
    calendars: 'Calendarios de la Corte. Seleccione un departamento para ver su calendario.',
    calendar: 'Calendario del Departamento {n}.',
    map: 'Encuentre su Camino. Busque o toque un destino para ver las indicaciones.',
    service: 'Para usar este servicio, escanee el código QR con su propio teléfono. No está disponible en este quiosco.',
    'courtroom-finder': 'Buscador de Salas. Escriba un número de caso o apellido para saber dónde se atiende su caso hoy.',
  },
};

/**
 * Visitor accessibility modes for the kiosk.
 *
 * Privacy: nothing is persisted — all modes are per-visitor and are reset
 * (and any speech cancelled) by the idle timer when the kiosk returns home,
 * so the next visitor never inherits audio output or display modes.
 * Audio is self-voicing via the Web Speech API; route it to a headphone
 * jack at the OS level for private listening.
 */
@Injectable({ providedIn: 'root' })
export class AccessibilityService {
  private readonly i18n = inject(I18nService);

  readonly largeText = signal(false);
  readonly highContrast = signal(false);
  readonly audio = signal(false);

  constructor() {
    effect(() => {
      document.body.classList.toggle('a11y-large', this.largeText());
      document.body.classList.toggle('a11y-contrast', this.highContrast());
    });

    inject(Router).events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => this.announceRoute(e.urlAfterRedirects));
  }

  toggleLargeText(): void {
    this.largeText.update((v) => !v);
    this.speak(this.spoken(this.largeText() ? 'large_on' : 'large_off'));
  }

  toggleContrast(): void {
    this.highContrast.update((v) => !v);
    this.speak(this.spoken(this.highContrast() ? 'contrast_on' : 'contrast_off'));
  }

  toggleAudio(): void {
    const on = !this.audio();
    if (on) {
      this.audio.set(on);
      this.speak(this.spoken('audio_on'));
    } else {
      // say goodbye, then disable so nothing else is voiced
      this.speak(this.spoken('audio_off'));
      this.audio.set(on);
    }
  }

  /** Speak text aloud — no-ops unless audio mode is on. Cancels prior speech. */
  speak(text: string): void {
    if (!this.audio() || !('speechSynthesis' in window)) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = this.i18n.lang() === 'es' ? 'es-ES' : 'en-US';
    u.rate = 0.95;
    speechSynthesis.speak(u);
  }

  stop(): void {
    if ('speechSynthesis' in window) speechSynthesis.cancel();
  }

  /** Back to defaults for the next visitor (called on idle reset). */
  resetAll(): void {
    this.stop();
    this.largeText.set(false);
    this.highContrast.set(false);
    this.audio.set(false);
  }

  private spoken(key: string): string {
    return this.i18n.pick(SPOKEN)[key];
  }

  private announceRoute(url: string): void {
    if (!this.audio()) return;
    const segs = url.split('?')[0].split('/').filter(Boolean);
    const pages = this.i18n.pick(PAGES);
    if (segs[0] === 'calendar' && segs[1]) {
      this.speak(pages['calendar'].replace('{n}', segs[1]));
    } else {
      const msg = pages[segs[0] ?? ''];
      if (msg) this.speak(msg);
    }
  }
}

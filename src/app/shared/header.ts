import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Dict, I18nService } from '../core/i18n.service';
import { AccessibilityService } from '../core/accessibility.service';

const STRINGS: Dict<{ large: string; contrast: string; audio: string; a11y: string }> = {
  en: {
    large: 'Large text',
    contrast: 'High contrast',
    audio: 'Audio assistance (read aloud)',
    a11y: 'Accessibility options',
  },
  es: {
    large: 'Texto grande',
    contrast: 'Alto contraste',
    audio: 'Asistencia de audio (lectura en voz alta)',
    a11y: 'Opciones de accesibilidad',
  },
};

@Component({
  selector: 'app-header',
  imports: [RouterLink],
  template: `
    <nav class="court-navbar">
      <a routerLink="/" class="brand-name">
        <img src="assets/PATH-trans-BG.png" alt="PATH — Public Access Terminal &amp; Help" />
      </a>
      <span class="subtitle">Superior Court of California &nbsp;·&nbsp; County of Monterey</span>
      <div class="a11y-switch" role="group" [attr.aria-label]="s().a11y">
        <button
          class="a11y-btn"
          [class.active]="a11y.largeText()"
          [attr.aria-pressed]="a11y.largeText()"
          [attr.aria-label]="s().large"
          [title]="s().large"
          (click)="a11y.toggleLargeText()"
        >A<sup>+</sup></button>
        <button
          class="a11y-btn"
          [class.active]="a11y.highContrast()"
          [attr.aria-pressed]="a11y.highContrast()"
          [attr.aria-label]="s().contrast"
          [title]="s().contrast"
          (click)="a11y.toggleContrast()"
        >◐</button>
        <button
          class="a11y-btn"
          [class.active]="a11y.audio()"
          [attr.aria-pressed]="a11y.audio()"
          [attr.aria-label]="s().audio"
          [title]="s().audio"
          (click)="a11y.toggleAudio()"
        >🔊</button>
      </div>
      <div class="lang-switch">
        <button class="lang-btn" [class.active]="i18n.lang() === 'en'" (click)="i18n.setLang('en')">EN</button>
        <button class="lang-btn" [class.active]="i18n.lang() === 'es'" (click)="i18n.setLang('es')">ES</button>
      </div>
    </nav>
  `,
})
export class Header {
  protected readonly i18n = inject(I18nService);
  protected readonly a11y = inject(AccessibilityService);
  protected readonly s = computed(() => this.i18n.pick(STRINGS));
}

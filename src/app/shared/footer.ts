import { Component, computed, inject } from '@angular/core';
import { Dict, I18nService } from '../core/i18n.service';

const STRINGS: Dict<{ usage: string; credits: string }> = {
  en: { usage: 'Usage Policy', credits: 'Site Credits' },
  es: { usage: 'Política de Uso', credits: 'Créditos del Sitio' },
};

@Component({
  selector: 'app-footer',
  template: `
    <footer class="court-footer">
      Superior Court of California, County of Monterey &nbsp;|&nbsp;
      <a href="#">{{ s().usage }}</a> &nbsp;|&nbsp;
      <a href="#">{{ s().credits }}</a>
    </footer>
  `,
})
export class Footer {
  private readonly i18n = inject(I18nService);
  protected readonly s = computed(() => this.i18n.pick(STRINGS));
}

import { Injectable, signal } from '@angular/core';

export type Lang = 'en' | 'es';

/** Every translatable string bundle has an English and a Spanish variant. */
export interface Dict<T> {
  en: T;
  es: T;
}

// Same localStorage key as the original static app, so a kiosk upgraded
// in place keeps the visitor's language choice.
const KEY = 'path-lang';

@Injectable({ providedIn: 'root' })
export class I18nService {
  readonly lang = signal<Lang>((localStorage.getItem(KEY) as Lang) || 'en');

  constructor() {
    document.documentElement.lang = this.lang();
  }

  setLang(l: Lang): void {
    localStorage.setItem(KEY, l);
    document.documentElement.lang = l;
    this.lang.set(l);
  }

  /** Reactive: reading this inside a template/computed tracks the lang signal. */
  pick<T>(dict: Dict<T>): T {
    return dict[this.lang()];
  }
}

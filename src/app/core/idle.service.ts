import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { Dict, I18nService } from './i18n.service';
import { AccessibilityService } from './accessibility.service';

// 105 s idle + 15 s countdown = same 2-minute reset as the static app,
// but with a "still there?" warning before the kiosk goes home.
const IDLE_MS = 105_000;
const WARN_MS = 15_000;

const STRINGS: Dict<{ title: string; text: string; stay: string }> = {
  en: {
    title: 'Are you still there?',
    text: 'This kiosk will return to the home screen shortly.',
    stay: "I'm still here",
  },
  es: {
    title: '¿Sigue ahí?',
    text: 'Este quiosco volverá a la pantalla de inicio en breve.',
    stay: 'Sigo aquí',
  },
};

@Injectable({ providedIn: 'root' })
export class IdleService {
  private readonly router = inject(Router);
  private readonly i18n = inject(I18nService);
  private readonly a11y = inject(AccessibilityService);
  private timer: ReturnType<typeof setTimeout> | undefined;
  private warning = false;

  start(): void {
    const reset = () => this.reset();
    for (const ev of ['click', 'touchstart', 'pointerdown', 'keydown', 'mousemove', 'scroll', 'wheel']) {
      window.addEventListener(ev, reset, { passive: true });
    }
    this.reset();
  }

  private reset(): void {
    if (this.warning) return; // the warning dialog owns the countdown
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.warn(), IDLE_MS);
  }

  private warn(): void {
    if (this.router.url === '/') {
      this.reset();
      return;
    }
    const s = this.i18n.pick(STRINGS);
    this.warning = true;
    this.a11y.speak(`${s.title} ${s.text}`);
    Swal.fire({
      title: s.title,
      text: s.text,
      confirmButtonText: s.stay,
      confirmButtonColor: '#214c76',
      timer: WARN_MS,
      timerProgressBar: true,
      allowOutsideClick: false,
    }).then((res) => {
      this.warning = false;
      if (res.dismiss === Swal.DismissReason.timer) {
        // fresh kiosk for the next visitor: home screen, default display, audio off
        this.a11y.resetAll();
        this.router.navigateByUrl('/');
      }
      this.reset();
    });
  }
}

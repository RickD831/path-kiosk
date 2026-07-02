import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

/* ── Calendar Boards (Court.CCMS.Api) — read-only board endpoints ────────────
   Calls go to relative /api/... paths. In development the Angular dev server
   proxies them to the internal CCMS API (see proxy.conf.sample.json); in
   production the web server should reverse-proxy the same paths, scoped to
   the read-only board endpoints only. */

export interface BoardHearing {
  case: string;
  name: string;
  date: string; // local ISO
  time: string; // display time, e.g. "1:30"
  judgeName: string;
  courtroom: string; // zero-padded, e.g. "07"
  floor: string; // "1" | "2" | "3" | "B" — matches the wayfinding floors
}

interface BoardResponse {
  data: {
    type: number;
    name: string;
    judgeDisplayName: string;
    hearings: BoardHearing[];
  } | null;
  message: string;
  resultCode: number;
}

/** This kiosk serves the Salinas courthouse. */
const LOCATION = 'Salinas';
const STALE_MS = 60_000;

function localIso(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

@Injectable({ providedIn: 'root' })
export class CalendarBoardsService {
  private readonly http = inject(HttpClient);

  /** Today's full lobby board (all hearings, all names) — the lookup dataset. */
  readonly lobby = signal<BoardHearing[] | null>(null);
  readonly loadedAt = signal<Date | null>(null);
  readonly loading = signal(false);
  readonly error = signal(false);

  /** Fetch the lobby board if we don't have a fresh copy. */
  async ensureLobby(force = false): Promise<void> {
    const at = this.loadedAt();
    if (!force && at && Date.now() - at.getTime() < STALE_MS && this.lobby()) return;
    this.loading.set(true);
    this.error.set(false);
    try {
      const res = await firstValueFrom(
        this.http.get<BoardResponse>('/api/calendar/board/lobby', {
          params: { date: localIso(), location: LOCATION, from: 'A', to: 'Z' },
        }),
      );
      this.lobby.set(res.data?.hearings ?? []);
      this.loadedAt.set(new Date());
    } catch {
      this.error.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  /** Today's board for one department (for the live department calendars). */
  async courtroomBoard(dept: number): Promise<{ judge: string; hearings: BoardHearing[] } | null> {
    try {
      const res = await firstValueFrom(
        this.http.get<BoardResponse>('/api/calendar/board/courtroom', {
          params: { date: localIso(), courtroom: 'D' + String(dept).padStart(2, '0') },
        }),
      );
      return { judge: res.data?.judgeDisplayName ?? '', hearings: res.data?.hearings ?? [] };
    } catch {
      return null;
    }
  }
}

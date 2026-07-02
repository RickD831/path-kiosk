import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { IdleService } from './core/idle.service';
import { Header } from './shared/header';
import { Footer } from './shared/footer';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header, Footer],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  constructor() {
    inject(IdleService).start();
  }
}

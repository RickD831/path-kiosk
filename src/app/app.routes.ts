import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    title: 'PATH — Public Access Terminal & Help',
    loadComponent: () => import('./pages/home/home').then((m) => m.Home),
  },
  {
    path: 'services',
    title: 'Court Services — PATH',
    loadComponent: () => import('./pages/services/services').then((m) => m.Services),
  },
  {
    path: 'courtroom-finder',
    title: 'Courtroom Finder — PATH',
    loadComponent: () => import('./pages/case-lookup/case-lookup').then((m) => m.CaseLookup),
  },
  { path: 'case-lookup', redirectTo: 'courtroom-finder' },
  {
    path: 'service/:id',
    title: 'Court Services — PATH',
    loadComponent: () => import('./pages/service-info/service-info').then((m) => m.ServiceInfoPage),
  },
  {
    path: 'calendars',
    title: 'Court Calendars — PATH',
    loadComponent: () => import('./pages/calendars/calendars').then((m) => m.Calendars),
  },
  {
    path: 'calendar/:dept',
    title: 'Department Calendar — PATH',
    loadComponent: () => import('./pages/calendar/calendar').then((m) => m.Calendar),
  },
  {
    path: 'map',
    title: 'Find Your Way — PATH',
    loadComponent: () => import('./pages/map/map').then((m) => m.MapPage),
  },
  { path: '**', redirectTo: '' },
];

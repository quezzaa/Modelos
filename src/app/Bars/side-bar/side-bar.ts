import { Component, signal, ViewChild } from '@angular/core';
import { MatSidenavModule, MatSidenav } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatRippleModule } from '@angular/material/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink } from '@angular/router';

interface MenuItem {
  label: string;
  icon: string;
  route?: string;
  expandable?: boolean;
  expanded?: boolean;
  children?: MenuItem[];
}

@Component({
  selector: 'app-side-bar',
  standalone: true,
  imports: [
    CommonModule,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatRippleModule,
    RouterOutlet,
    RouterLink
  ],
  templateUrl: './side-bar.html',
  styleUrl: './side-bar.css',
})
export class SideBar {
  @ViewChild('sidenav') sidenav!: MatSidenav;

  menuItems: MenuItem[] = [
    { label: 'Inicio', icon: 'dashboard', route: '/inicio' },
    {
      label: 'Continuos',
      icon: 'tune',
      expandable: true,
      expanded: false,
      children: [
        { label: 'Normal', icon: 'show_chart', route: '/continuos/normal' },
      ]
    },
    {
      label: 'Discretos',
      icon: 'apps',
      expandable: true,
      expanded: false,
      children: [
        { label: 'Binominal', icon: 'model_training', route: '/discretos/binominal' },
        { label: 'Poisson', icon: 'equalizer', route: '/discretos/poisson' },
      ]
    },
    {
      label: 'Lectura',
      icon: 'book',
      expandable: true,
      expanded: false,
      children: [
        { label: 'Leer Archivo', icon: 'chrome_reader_mode', route: '/lectura/archivos' },
      ]
    }
  ];

  toggleExpand(item: MenuItem): void {
    if (item.expandable) {
      item.expanded = !item.expanded;
    }
  }
}

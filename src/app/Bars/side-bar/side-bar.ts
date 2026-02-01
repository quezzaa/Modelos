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
        { label: 'item1', icon: 'show_chart', route: '/continuos/item1' },
      ]
    },
    {
      label: 'Discretos',
      icon: 'apps',
      expandable: true,
      expanded: false,
      children: [
        { label: 'Binominal', icon: 'model_training', route: '/discretos/binominal' },
      ]
    },
  ];

  toggleExpand(item: MenuItem): void {
    if (item.expandable) {
      item.expanded = !item.expanded;
    }
  }
}

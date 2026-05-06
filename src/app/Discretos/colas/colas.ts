import { Component, signal, inject, OnInit, effect, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';

import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';
import 'chart.js/auto';

import { FileDataService } from '../../Services/file-data.service';

interface ColaEstadisticos {
  Lq: number;
  Ls: number;
  Wq: number;
  Ws: number;
  ps: number;
  P0: number;
  Pn: number;
}

@Component({
  selector: 'app-colas',
  imports: [CommonModule,
    FormsModule,
    MatCardModule,
    MatInputModule,
    MatButtonModule,
    MatTableModule,
    MatRadioModule,
    MatSelectModule,
  BaseChartDirective],
  templateUrl: './colas.html',
  styleUrl: './colas.css',
})

export class Colas {
  lambda: number = 0;
  miu: number = 0;
  n: number = 0;

  dataSource: ColaEstadisticos[] = [];
  private cdr = inject(ChangeDetectorRef);
  // ---------- Gráfica de Distribución Pn (n=0 a 10) ----------
  pnChartData: ChartConfiguration<'bar'>['data'] = {
    labels: [],
    datasets: [
      {
        data: [],
        label: 'P(n)',
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1
      }
    ]
  };

  pnChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    scales: {
      y: {
        title: {
          display: true,
          text: 'Probabilidad P(n)',
          font: {
            size: 14,
            weight: 'bold',
          }
        },
        beginAtZero: true,
      },
      x: {
        title: {
          display: true,
          text: 'Número de clientes (n)',
          font: {
            size: 14,
            weight: 'bold',
          }
        }
      }
    }
  };

  // ---------- Gráfica Comparativa Lq vs Ls ----------
  lsLqChartData: ChartConfiguration<'bar'>['data'] = {
    labels: ['Lq', 'Ls'],
    datasets: [
      {
        data: [],
        label: 'Cantidad de clientes',
        backgroundColor: ['rgba(255, 99, 132, 0.6)', 'rgba(75, 192, 192, 0.6)'],
        borderColor: ['rgba(255, 99, 132, 1)', 'rgba(75, 192, 192, 1)'],
        borderWidth: 1
      }
    ]
  };

  lsLqChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    scales: {
      y: {
        title: {
          display: true,
          text: 'Número promedio de clientes',
          font: {
            size: 14,
            weight: 'bold',
          }
        },
        beginAtZero: true,
      }
    }
  };

  calcular() {
    const rho = this.lambda / this.miu;
    if (rho >= 1) {
      alert("El sistema no es estable (λ debe ser menor que μ). Por favor, ingrese valores válidos.");
      return;
    }
    if (this.n < 0 || this.lambda <= 0 || this.miu <= 0) {
      alert("Por favor, ingrese valores válidos (n ≥ 0, λ > 0, μ > 0).");
      return;
    }

    const Lq = (rho * rho) / (1 - rho);
    const Ls = Lq + rho;
    const Wq = Lq / this.lambda;
    const Ws = Wq + (1 / this.miu);
    const P0 = 1 - rho;
    const Pn = (1 - rho) * Math.pow(rho, this.n);

    this.dataSource = [{
      Lq,
      Ls,
      Wq,
      Ws,
      ps: rho,
      P0,
      Pn
    }];

    this.ActualizarGraficas();
  }
  ActualizarGraficas() {
    // Actualizar gráfica de Pn (n=0 a 10)
    const pnLabels = [];
    const pnData = [];
    for (let i = 0; i <= 10; i++) {
      pnLabels.push(i.toString());
      pnData.push((1 - this.dataSource[0].ps) * Math.pow(this.dataSource[0].ps, i));
    }

    // Recrear objeto completo para forzar cambios en Chart.js
    this.pnChartData = {
      labels: pnLabels,
      datasets: [
        {
          data: pnData,
          label: 'P(n)',
          backgroundColor: 'rgba(54, 162, 235, 0.6)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1
        }
      ]
    };

    // Actualizar gráfica comparativa Lq vs Ls
    this.lsLqChartData = {
      labels: ['Lq', 'Ls'],
      datasets: [
        {
          data: [this.dataSource[0].Lq, this.dataSource[0].Ls],
          label: 'Cantidad de clientes',
          backgroundColor: ['rgba(255, 99, 132, 0.6)', 'rgba(75, 192, 192, 0.6)'],
          borderColor: ['rgba(255, 99, 132, 1)', 'rgba(75, 192, 192, 1)'],
          borderWidth: 1
        }
      ]
    };

    // Forzar detección de cambios
    this.cdr.detectChanges();
  }
}

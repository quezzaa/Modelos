import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';

import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';
import 'chart.js/auto';


interface BinominalRow {
  k: number;
  binominal: number;
  acumulada: number;
  porcentaje: number;
  porcentajeAcumulado: number;
}

@Component({
  selector: 'app-binominal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatInputModule,
    MatButtonModule,
    MatTableModule,
    BaseChartDirective
  ],
  templateUrl: './binominal.html',
  styleUrl: './binominal.css'
})
export class Binominal {

  n = 0;
  p = 0;

  // Estadísticos (población infinita)
  poblacionInfinita = true;
  media = 0;
  desviacion = 0;

  dataSource: BinominalRow[] = [];

  displayedColumns = [
    'k',
    'binominal',
    'acumulada',
    'porcentaje',
    'porcentajeAcumulado'
  ];

  // ---------- Gráfica P(X=x)% ----------
  barChartData: ChartConfiguration<'bar'>['data'] = {
    labels: [],
    datasets: [
      {
        data: [],
        label: 'P(x) %'
      }
    ]
  };

  barChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true
  };

  // ---------- Gráfica acumulada ----------
  lineChartData: ChartConfiguration<'line'>['data'] = {
    labels: [],
    datasets: [
      {
        data: [],
        label: 'P(x) % acumulada',
        fill: false
      }
    ]
  };

  lineChartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true
  };

  calcular() {
    if (this.p < 0 || this.p > 1) {
      alert('p debe estar entre 0 y 1');
      return;
    }

    this.dataSource = [];
    let acumulada = 0;

    this.media = this.n * this.p;
    this.desviacion = Math.sqrt(this.n * this.p * (1 - this.p));

    for (let x = 0; x <= this.n; x++) {
      const px = this.binomial(this.n, x, this.p);
      acumulada += px;

      this.dataSource.push({
        k: x,
        binominal: px,
        acumulada,
        porcentaje: px * 100,
        porcentajeAcumulado: acumulada * 100
      });
    }

    this.actualizarGraficas();
  }

  private actualizarGraficas() {
    const labels = this.dataSource.map(d => `x=${d.k}`);

    this.barChartData.labels = labels;
    this.barChartData.datasets[0].data =
      this.dataSource.map(d => +d.porcentaje.toFixed(4));

    this.lineChartData.labels = labels;
    this.lineChartData.datasets[0].data =
      this.dataSource.map(d => +d.porcentajeAcumulado.toFixed(4));
  }

  // ---------- Matemática ----------
  private binomial(n: number, x: number, p: number): number {
    return this.combinatoria(n, x) *
      Math.pow(p, x) *
      Math.pow(1 - p, n - x);
  }

  private combinatoria(n: number, x: number): number {
    return this.factorial(n) /
      (this.factorial(x) * this.factorial(n - x));
  }

  private factorial(n: number): number {
    let r = 1;
    for (let i = 2; i <= n; i++) r *= i;
    return r;
  }
}

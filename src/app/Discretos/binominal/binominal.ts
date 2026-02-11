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

  N = 0;
  n = 0;
  p = 0;

  // Estadísticos
  poblacionInfinita = true;
  media = 0;
  desviacion = 0;
  desviacionFinita = 0;
  factorCorreccion = 1;

  sesgo = 0;
  interpretacionSesgo = '';

  curtosis = 0;
  interpretacionCurtosis = '';

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
    responsive: true,
    scales: {
      y: {
        title: {
          display: true,
          text: 'Porcentaje (%)'
        },
        min: 0,
        max: 100
      }
    }
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
    responsive: true,
    scales: {
      y: {
        title: {
          display: true,
          text: 'Porcentaje acumulado (%)'
        },
        min: 0,
        max: 100
      }
    }
  };

  calcular() {

    if (this.p < 0 || this.p > 1) {
      alert('p debe estar entre 0 y 1');
      return;
    }

    this.poblacionInfinita = this.N <= 0;

    if (!this.poblacionInfinita) {
      const nMax = this.N * 0.05;
      if (this.n > nMax) {
        alert(`Para población finita, n debe ser ≤ ${nMax}`);
        return;
      }
    }

    this.dataSource = [];
    let acumulada = 0;

    // ---------- Media ----------
    this.media = this.n * this.p;

    // ---------- Varianza infinita ----------
    const varianzaInfinita = this.n * this.p * (1 - this.p);
    this.desviacion = Math.sqrt(varianzaInfinita);

    // ---------- Factor corrección ----------
    if (!this.poblacionInfinita && this.N > 1) {
      this.factorCorreccion = Math.sqrt((this.N - this.n) / (this.N - 1));
      this.desviacionFinita = this.desviacion * this.factorCorreccion;
    } else {
      this.factorCorreccion = 1;
      this.desviacionFinita = this.desviacion;
    }

    // ---------- Varianza real usada ----------
    const varianzaReal = this.poblacionInfinita
      ? varianzaInfinita
      : varianzaInfinita * (this.factorCorreccion ** 2);

    // ---------- Sesgo y Curtosis ----------
    if (varianzaReal === 0) {
      this.sesgo = 0;
      this.curtosis = 0;
    } else {

      const sigmaReal = Math.sqrt(varianzaReal);

      // Sesgo
      this.sesgo = (1 - 2 * this.p) / sigmaReal;

      // Curtosis (exceso)
      this.curtosis = (1 - 6 * this.p * (1 - this.p)) / varianzaReal;
    }

    // ---------- Interpretación Sesgo ----------
    this.sesgo = +this.sesgo.toFixed(2);
    if (this.sesgo === 0.00) {
      this.interpretacionSesgo = 'Neutro (Simétrica)';
    } else if (this.sesgo > 0) {
      this.interpretacionSesgo = 'Positivo (Asimetría hacia la derecha)';
    } else {
      this.interpretacionSesgo = 'Negativo (Asimetría hacia la izquierda)';
    }

    // ---------- Interpretación Curtosis ----------
    this.curtosis = +this.curtosis.toFixed(2);
    if (this.curtosis === 0.00) {
      this.interpretacionCurtosis = 'Mesocúrtica (Campana de Gauss)';
    } else if (this.curtosis > 0) {
      this.interpretacionCurtosis = 'Leptocúrtica (Más apuntada)';
    } else {
      this.interpretacionCurtosis = 'Platicúrtica (Más aplanada)';
    }

    // ---------- Distribución ----------
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
    if (this.dataSource.length > 0) {
      this.dataSource[this.dataSource.length - 1].porcentajeAcumulado = 100;
    }
    this.actualizarGraficas();
  }

  private actualizarGraficas() {

    const labels = this.dataSource.map(d => `x=${d.k}`);

    const porcentajes = this.dataSource.map(d => +d.porcentaje.toFixed(4));
    const porcentajesAcumulados = this.dataSource.map(d => +d.porcentajeAcumulado.toFixed(4));

    this.barChartData = {
      labels: labels,
      datasets: [
        {
          data: porcentajes,
          label: 'P(x) %'
        }
      ]
    };

    this.lineChartData = {
      labels: labels,
      datasets: [
        {
          data: porcentajesAcumulados,
          label: 'P(x) % acumulada',
          fill: false
        }
      ]
    };
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

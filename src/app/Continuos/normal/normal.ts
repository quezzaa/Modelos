import { Component, signal, OnInit, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';

import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';
import 'chart.js/auto';

interface NormalDistributionRow {
  z: number;
  x: number;
  densidad: number;
  acumulada: number;
}

@Component({
  selector: 'app-normal',
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
  templateUrl: './normal.html',
  styleUrl: './normal.css'
})
export class Normal implements OnInit {
  // Parámetros de la distribución normal
  noload = 0;
  media = signal(0);
  desviacion = signal(1);
  rangoInicio = signal(-3);
  rangoFin = signal(3);
  pasos = signal(50);

  // Resultados
  dataSource = signal<NormalDistributionRow[]>([]);
  displayedColumns = ['z', 'x', 'densidad', 'acumulada'];

  // Variables para cálculos
  mediaCalculo = 0;
  desviacionCalculo = 1;

  // Gráfica de función de densidad
  densityChartData: ChartConfiguration<'line'>['data'] = {
    labels: [],
    datasets: [
      {
        data: [],
        label: 'f(x) - Densidad de probabilidad',
        fill: false,
        borderColor: '#667eea',
        backgroundColor: 'rgba(102, 126, 234, 0.1)',
        borderWidth: 2,
        tension: 0.4
      }
    ]
  };

  densityChartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    plugins: {
      title: {
        display: true,
        text: 'Función de Densidad de Probabilidad Normal'
      }
    },
    scales: {
      y: {
        title: {
          display: true,
          text: 'Densidad f(x)'
        }
      },
      x: {
        title: {
          display: true,
          text: 'Valor X'
        }
      }
    }
  };

  // Gráfica acumulada
  cumulativeChartData: ChartConfiguration<'line'>['data'] = {
    labels: [],
    datasets: [
      {
        data: [],
        label: 'F(x) - Función acumulada',
        fill: true,
        borderColor: '#764ba2',
        backgroundColor: 'rgba(118, 75, 162, 0.1)',
        borderWidth: 2,
        tension: 0.4
      }
    ]
  };

  cumulativeChartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    plugins: {
      title: {
        display: true,
        text: 'Función de Distribución Acumulada'
      }
    },
    scales: {
      y: {
        min: 0,
        max: 1,
        title: {
          display: true,
          text: 'F(x)'
        }
      },
      x: {
        title: {
          display: true,
          text: 'Valor X'
        }
      }
    }
  };

  ngOnInit(): void {
    //
  }

  calcular(): void {
    // Validaciones
    if (this.desviacion() <= 0) {
      alert('La desviación estándar debe ser mayor a 0');
      return;
    }

    if (this.pasos() < 10 || this.pasos() > 1000) {
      alert('El número de pasos debe estar entre 10 y 1000');
      return;
    }

    if (this.rangoInicio() >= this.rangoFin()) {
      alert('El rango de inicio debe ser menor al rango de fin');
      return;
    }

    this.mediaCalculo = this.media();
    this.desviacionCalculo = this.desviacion();

    const paso = (this.rangoFin() - this.rangoInicio()) / this.pasos();
    const datos: NormalDistributionRow[] = [];

    for (let i = 0; i <= this.pasos(); i++) {
      const z = this.rangoInicio() + i * paso;
      const x = this.mediaCalculo + z * this.desviacionCalculo;
      const densidad = this.funcDensidad(z);
      const acumulada = this.funcAcumulada(z);

      datos.push({
        z: +z.toFixed(4),
        x: +x.toFixed(4),
        densidad: +densidad.toFixed(6),
        acumulada: +acumulada.toFixed(6)
      });
    }

    this.dataSource.set(datos);
    this.actualizarGraficas(datos);
  }

  private actualizarGraficas(datos: NormalDistributionRow[]): void {
    const labels = datos.map(d => d.x.toFixed(2));
    const densidades = datos.map(d => d.densidad);
    const acumuladas = datos.map(d => d.acumulada);

    this.densityChartData = {
      labels: labels,
      datasets: [
        {
          data: densidades,
          label: 'f(x) - Densidad de probabilidad',
          fill: false,
          borderColor: '#667eea',
          backgroundColor: 'rgba(102, 126, 234, 0.1)',
          borderWidth: 2,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 8
        }
      ]
    };

    this.cumulativeChartData = {
      labels: labels,
      datasets: [
        {
          data: acumuladas,
          label: 'F(x) - Función acumulada',
          fill: true,
          borderColor: '#764ba2',
          backgroundColor: 'rgba(118, 75, 162, 0.1)',
          borderWidth: 2,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 8
        }
      ]
    };
  }

  // Función de densidad de probabilidad normal estándar
  private funcDensidad(z: number): number {
    return (1 / Math.sqrt(2 * Math.PI)) * Math.exp((-z * z) / 2);
  }

  // Función de distribución acumulada (aproximación de Abramowitz y Stegun)
  private funcAcumulada(z: number): number {
    // Constantes para aproximación
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    // Guardar el signo de z
    const sign = z < 0 ? -1 : 1;
    z = Math.abs(z) / Math.sqrt(2);

    // Aproximación de Abramowitz y Stegun
    const t = 1 / (1 + p * z);
    const t2 = t * t;
    const t3 = t2 * t;
    const t4 = t3 * t;
    const t5 = t4 * t;

    const y = 1 - (a5 * t5 + a4 * t4 + a3 * t3 + a2 * t2 + a1 * t) * Math.exp(-z * z);

    return 0.5 * (1 + sign * y);
  }

  // Cálculo de probabilidad P(a < X < b)
  calcularProbabilidad(a: number, b: number): number {
    const za = (a - this.mediaCalculo) / this.desviacionCalculo;
    const zb = (b - this.mediaCalculo) / this.desviacionCalculo;

    return this.funcAcumulada(zb) - this.funcAcumulada(za);
  }

  // Cálculo de cuantil (inversa de F)
  // Usa el método de Newton-Raphson
  calcularCuantil(p: number): number {
    if (p <= 0 || p >= 1) {
      return NaN;
    }

    // Aproximación inicial
    let x = 0;
    if (p < 0.5) {
      x = Math.sqrt(-2 * Math.log(p));
      x = -(x - (2.515517 + 0.802853 * x + 0.010328 * x * x) / 
           (1 + 1.432788 * x + 0.189269 * x * x + 0.001308 * x * x * x));
    } else {
      x = Math.sqrt(-2 * Math.log(1 - p));
      x = (x - (2.515517 + 0.802853 * x + 0.010328 * x * x) / 
           (1 + 1.432788 * x + 0.189269 * x * x + 0.001308 * x * x * x));
    }

    // Mejora con Newton-Raphson (1-2 iteraciones generalmente)
    for (let i = 0; i < 3; i++) {
      const fx = this.funcAcumulada(x) - p;
      const fpx = this.funcDensidad(x);
      if (Math.abs(fpx) < 1e-10) break;
      x = x - fx / fpx;
    }

    return this.mediaCalculo + x * this.desviacionCalculo;
  }
}

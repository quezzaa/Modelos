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
  xRango = ''; // Puede ser: "5", "0-3", ">3", "<5", ">=2"

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

  // Mensaje de validación para x
  xValido = true;
  xMensaje = '';

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
    backgroundColor: 'rgba(75,192,192,0.4)',
    scales: {
      y: {
        title: {
          display: true,
          text: 'Porcentaje (%)',
          font: {
            'size': 20,
            'weight': 'bold',
          }
        },
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
        fill: true,
      }
    ]
  };

  lineChartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    backgroundColor: 'rgba(75,192,192,0.4)',
    scales: {
      y: {
        title: {
          display: true,
          text: 'Porcentaje acumulado (%)',
          font: {
            'size': 20,
            'weight': 'bold',
          }

        },
      },
    }
  };

  calcular() {
    // Validar inputs básicos
    if (this.n <= 0) {
      alert('n (muestra) debe ser mayor a 0');
      return;
    }

    if (this.p < 0 || this.p > 1) {
      alert('p debe estar entre 0 y 1');
      return;
    }

    if (!this.xRango.trim()) {
      alert('x (valor o rango) es requerido');
      return;
    }

    // Parse y validar x
    const valoresX = this.parseXRango();
    if (!this.xValido) {
      alert(this.xMensaje);
      return;
    }

    // ---------- Determinar si es población infinita o finita ----------
    if (this.N <= 0) {
      this.poblacionInfinita = true;
    } else {
      const porcentajeMuestra = (this.n / this.N) * 100;
      // Infinita: < 5%
      // Finita: >= 5% y < 20%
      // Error: >= 20%
      if (porcentajeMuestra < 5) {
        this.poblacionInfinita = true;
      } else if (porcentajeMuestra < 20) {
        this.poblacionInfinita = false;
      } else {
        alert(`n/N = ${porcentajeMuestra.toFixed(2)}%. Para población finita, n debe ser < 20% de N`);
        return;
      }
    }

    this.dataSource = [];
    let acumuladaTotal = 0;

    // Calcular distribución para todos los valores 0 a n
    const distribucionCompleta: BinominalRow[] = [];
    for (let x = 0; x <= this.n; x++) {
      const px = this.binomial(this.n, x, this.p);
      acumuladaTotal += px;
      distribucionCompleta.push({
        k: x,
        binominal: px,
        acumulada: acumuladaTotal,
        porcentaje: px * 100,
        porcentajeAcumulado: acumuladaTotal * 100
      });
    }

    // Filtrar solo los valores de x solicitados
    this.dataSource = distribucionCompleta.filter(row => valoresX.includes(row.k));

    if (this.dataSource.length === 0) {
      alert('El rango de x especificado no generó resultados');
      return;
    }

    // Recalcular acumulada según el rango filtrado
    let acumuladaFiltrada = 0;
    for (let row of this.dataSource) {
      acumuladaFiltrada += row.binominal;
      row.acumulada = acumuladaFiltrada;
      row.porcentajeAcumulado = acumuladaFiltrada * 100;
    }

    // ---------- Media ----------
    this.media = this.n * this.p;

    // ---------- Varianza infinita ----------
    const varianzaInfinita = this.n * this.p * (1 - this.p);
    this.desviacion = Math.sqrt(varianzaInfinita);

    // ---------- Factor corrección (solo para población finita) ----------
    this.factorCorreccion = 1;
    this.desviacionFinita = this.desviacion;

    if (!this.poblacionInfinita && this.N > 1) {
      this.factorCorreccion = Math.sqrt((this.N - this.n) / (this.N - 1));
      this.desviacionFinita = this.desviacion * this.factorCorreccion;
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

    this.actualizarGraficas();
  }

  private parseXRango(): number[] {
    this.xValido = true;
    this.xMensaje = '';

    const x = this.xRango.trim();
    const valores: number[] = [];

    // Caso: "5" (valor único)
    if (/^=?\d+$/.test(x)) {
      const val = parseInt(x.replace('=', ''));
      if (val < 0 || val > this.n) {
        this.xValido = false;
        this.xMensaje = `x debe estar entre 0 y ${this.n}`;
        return [];
      }
      return [val];
    }

    // Caso: "0-3" (rango)
    if (/^\d+-\d+$/.test(x)) {
      const [inicio, fin] = x.split('-').map(Number);
      if (inicio > fin) {
        this.xValido = false;
        this.xMensaje = 'Rango inválido: inicio debe ser menor que fin';
        return [];
      }
      if (fin > this.n) {
        this.xValido = false;
        this.xMensaje = `El rango no puede exceder n=${this.n}`;
        return [];
      }
      for (let i = inicio; i <= fin; i++) {
        valores.push(i);
      }
      return valores;
    }

    // Caso: ">3" (mayor que)
    if (/^>\d+$/.test(x)) {
      const val = parseInt(x.substring(1));
      for (let i = val + 1; i <= this.n; i++) {
        valores.push(i);
      }
      return valores;
    }

    // Caso: ">=3" (mayor o igual que)
    if (/^>=\d+$/.test(x)) {
      const val = parseInt(x.substring(2));
      for (let i = val; i <= this.n; i++) {
        valores.push(i);
      }
      return valores;
    }

    // Caso: "<3" (menor que)
    if (/^<\d+$/.test(x)) {
      const val = parseInt(x.substring(1));
      for (let i = 0; i < val; i++) {
        valores.push(i);
      }
      return valores;
    }

    // Caso: "<=3" (menor o igual que)
    if (/^<=\d+$/.test(x)) {
      const val = parseInt(x.substring(2));
      for (let i = 0; i <= val; i++) {
        valores.push(i);
      }
      return valores;
    }

    this.xValido = false;
    this.xMensaje = 'Formato de x inválido. Use: "5", "0-3", ">3", ">=3", "<5" o "<=5"';
    return [];
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
          fill: false,
          pointRadius: 10,
          pointHoverRadius: 14
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

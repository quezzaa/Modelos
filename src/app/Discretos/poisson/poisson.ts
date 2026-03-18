import { Component, signal, inject, OnInit, effect } from '@angular/core';
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

interface DistributionRow {
  x: number;
  probabilidad: number;
  acumulada: number;
  porcentaje: number;
  porcentajeAcumulado: number;
}

@Component({
  selector: 'app-poisson',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatInputModule,
    MatButtonModule,
    MatTableModule,
    MatRadioModule,
    MatSelectModule,
    BaseChartDirective
  ],
  templateUrl: './poisson.html',
  styleUrl: './poisson.css'
})
export class Poisson implements OnInit {
  private fileDataService = inject(FileDataService);
  private router = inject(Router);

  // Notificación de datos del archivo
  dataFromFile = signal(false);
  validarAproximacion = signal(false);

  // Parámetros
  n = 0; // Tamaño de muestra (para validación de Poisson como aproximación de Binomial)
  p = 0; // Probabilidad (para validación de Poisson como aproximación de Binomial)
  lambda = 0; // Tasa promedio de ocurrencia
  xRango = ''; // Puede ser: "5", "0-3", ">3", "<5", ">=2"

  // Sugerencia de cambio a Binomial
  debeUsarBinomial = false;
  mensajeSugerencia = '';

  // Estadísticos
  media = 0;
  desviacion = 0;
  sesgo = 0;
  interpretacionSesgo = '';
  curtosis = 0;
  interpretacionCurtosis = '';

  // Tolerancia e Intervalo de Confianza
  tolerancia = 0; // Margen de error (σ)
  nivelConfianza = 0.95; // 95% por defecto
  limiteInferior = 0; // λ - z*σ
  limiteSuperior = 0; // λ + z*σ
  errorEstandar = 0; // σ/√n (si aplica)

  // Mensaje de validación para x
  xValido = true;
  xMensaje = '';

  dataSource: DistributionRow[] = [];

  displayedColumns = [
    'x',
    'probabilidad',
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

  constructor() {
    // Efecto para monitorear cambios en los datos del servicio
    effect(() => {
      const fileData = this.fileDataService.getFileData();
      if (fileData) {
        this.n = fileData.N ?? 0;
        if (fileData.K !== undefined && fileData.N !== undefined && fileData.N > 0) {
          {
            this.p = fileData.p || (fileData.K / fileData.N);
          }
          this.lambda = this.n * this.p; // λ = n * p

          this.dataFromFile.set(true);
          this.validarAproximacion.set(true);

          console.log('Datos cargados del archivo para Poisson:', {
            n: this.n,
            p: this.p,
            lambda: this.lambda
          });
        }
      }
    });
  }

  ngOnInit(): void {
    // Inicialización si es necesaria
  }

  calcular() {
    // Validaciones iniciales
    if (!this.xRango.trim()) {
      alert('x (valor o rango) es requerido');
      return;
    }

    // Si lambda no se proporciona, calcularla como n * p
    if (this.lambda <= 0 && this.n > 0 && this.p > 0) {
      this.lambda = this.n * this.p;
      console.log('Lambda calculado como n * p:', this.lambda);
    }

    // Validación: lambda debe ser positivo (después del cálculo opcional)
    if (this.lambda <= 0) {
      alert('λ (lambda) debe ser mayor a 0 o proporcionar n y p válidos');
      return;
    }

    // Validación: verificar si es apropiado usar Poisson
    // Esta validación se ejecuta SIEMPRE cuando n y p están disponibles
    if (this.n > 0 && this.p > 0) {
      const mediaBinomial = this.n * this.p;

      // Criterio estricto: p < 0.10 Y n*p < 10
      const cumpleCriterios = (this.p < 0.10) && (mediaBinomial < 10);

      if (!cumpleCriterios) {
        alert(
          `⚠ RESTRICCIÓN DE MODELO:\n\n` +
          `p = ${this.p.toFixed(4)} (Límite < 0.10)\n` +
          `μ (n*p) = ${mediaBinomial.toFixed(4)} (Límite < 10)\n\n` +
          `No se cumplen los criterios para Poisson. Los datos se enviarán a Binomial.`
        );

        this.fileDataService.setFileData({
          N: 0,
          n: this.n,
          K: Math.round(this.n * this.p),
          p: this.p,
          selectedKState: 'desde-poisson',
          distributionType: 'binomial'
        });

        this.router.navigate(['/discretos/binominal']);
        return;
      }
    }

    // Calcular Poisson
    this.calcularPoisson();
  }

  private calcularPoisson() {
    // Parse y validar x
    const valoresX = this.parseXRango();
    if (!this.xValido) {
      alert(this.xMensaje);
      return;
    }

    this.dataSource = [];
    let acumuladaTotal = 0;

    // Calcular distribución para todos los valores 0 a un máximo razonable
    // Para Poisson, típicamente calculamos hasta que la probabilidad sea muy pequeña
    const maxX = Math.max(
      ...valoresX,
      Math.ceil(this.lambda + 3 * Math.sqrt(this.lambda)) // μ + 3σ como límite
    );

    const distribucionCompleta: DistributionRow[] = [];
    for (let x = 0; x <= maxX; x++) {
      const px = this.poisson(this.lambda, x);
      acumuladaTotal += px;
      distribucionCompleta.push({
        x: x,
        probabilidad: px,
        acumulada: acumuladaTotal,
        porcentaje: px * 100,
        porcentajeAcumulado: acumuladaTotal * 100
      });
    }

    // Filtrar solo los valores de x solicitados
    this.dataSource = distribucionCompleta.filter(row => valoresX.includes(row.x));

    if (this.dataSource.length === 0) {
      alert('El rango de x especificado no generó resultados');
      return;
    }

    // Recalcular acumulada según el rango filtrado
    let acumuladaFiltrada = 0;
    for (let row of this.dataSource) {
      acumuladaFiltrada += row.probabilidad;
      row.acumulada = acumuladaFiltrada;
      row.porcentajeAcumulado = acumuladaFiltrada * 100;
    }

    // Calcular estadísticos
    this.calcularEstadisticosPoisson();
    this.actualizarGraficas();
  }

  private calcularEstadisticosPoisson() {
    this.media = this.lambda;
    this.desviacion = Math.sqrt(this.lambda);

    const medianaEstimada = Math.floor(this.lambda + (1 / 3) - (0.02 / this.lambda));

    if (this.media > medianaEstimada) {
      this.interpretacionSesgo = 'Sesgo positivo (Media > Mediana)';
    } else if (this.media < medianaEstimada) {
      this.interpretacionSesgo = 'Sesgo negativo (Media < Mediana)';
    } else {
      this.interpretacionSesgo = 'Sesgo nulo (Media = Mediana)';
    }

    this.curtosis = 1 / this.lambda;
    if (this.curtosis > 0) {
      this.interpretacionCurtosis = 'Leptocúrtica';
    } else if (this.curtosis < 0) {
      this.interpretacionCurtosis = 'Platicúrtica';
    } else {
      this.interpretacionCurtosis = 'Mesocúrtica (Campana de Gauss)';
    }

    // Calcular tolerancia e intervalo de confianza
    this.calcularToleranciaIntervalos();
  }

  private calcularToleranciaIntervalos() {
    // Tolerancia: desviación estándar
    this.tolerancia = this.desviacion;

    // Error estándar (si n y p están disponibles)
    if (this.n > 0 && this.p > 0) {
      this.errorEstandar = this.desviacion / Math.sqrt(this.n);
    } else {
      this.errorEstandar = this.desviacion;
    }

    // Valor Z para 95% de confianza (aproximadamente 1.96)
    // Para 99% sería 2.576, para 90% sería 1.645
    const valoresZ: { [key: number]: number } = {
      0.90: 1.645,
      0.95: 1.960,
      0.99: 2.576
    };

    const z = valoresZ[this.nivelConfianza] || 1.960;

    // Intervalo de confianza para λ usando método Score de Wilson aproximado
    // Intervalo simple: λ ± z*√λ
    this.limiteInferior = Math.max(0, this.lambda - z * this.desviacion);
    this.limiteSuperior = this.lambda + z * this.desviacion;
  }

  private parseXRango(): number[] {
    this.xValido = true;
    this.xMensaje = '';

    const x = this.xRango.trim();
    const valores: number[] = [];

    // Máximo razonable para Poisson
    const maxX = Math.ceil(this.lambda + 5 * Math.sqrt(this.lambda));

    // Caso: "5" (valor único)
    if (/^=?\d+$/.test(x)) {
      const val = parseInt(x.replace('=', ''));
      if (val < 0) {
        this.xValido = false;
        this.xMensaje = `x debe ser un valor no negativo`;
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
      for (let i = inicio; i <= fin; i++) {
        valores.push(i);
      }
      return valores;
    }

    // Caso: ">3" (mayor que)
    if (/^>\d+$/.test(x)) {
      const val = parseInt(x.substring(1));
      for (let i = val + 1; i <= maxX; i++) {
        valores.push(i);
      }
      return valores;
    }

    // Caso: ">=3" (mayor o igual que)
    if (/^>=\d+$/.test(x)) {
      const val = parseInt(x.substring(2));
      for (let i = val; i <= maxX; i++) {
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
    const labels = this.dataSource.map(d => `x=${d.x}`);
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
  private poisson(lambda: number, x: number): number {
    // P(X=x) = (e^-λ * λ^x) / x!
    const numerador = Math.exp(-lambda) * Math.pow(lambda, x);
    const denominador = this.factorial(x);
    return numerador / denominador;
  }

  private factorial(n: number): number {
    let r = 1;
    for (let i = 2; i <= n; i++) r *= i;
    return r;
  }
}

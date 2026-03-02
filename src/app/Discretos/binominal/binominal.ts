import { Component, signal, inject, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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

interface DistributionComparison {
  binomial: {
    dataSource: DistributionRow[];
    media: number;
    desviacion: number;
    desviacionFinita: number;
    factorCorreccion: number;
    sesgo: number;
    interpretacionSesgo: string;
    curtosis: number;
    interpretacionCurtosis: string;
    tipoCalculoActual: string;
    barChartData: ChartConfiguration<'bar'>['data'];
    lineChartData: ChartConfiguration<'line'>['data'];
  };
  hipergeometrica: {
    dataSource: DistributionRow[];
    media: number;
    desviacion: number;
    desviacionFinita: number;
    factorCorreccion: number;
    sesgo: number;
    interpretacionSesgo: string;
    curtosis: number;
    interpretacionCurtosis: string;
    tipoCalculoActual: string;
    barChartData: ChartConfiguration<'bar'>['data'];
    lineChartData: ChartConfiguration<'line'>['data'];
  };
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
    MatRadioModule,
    MatSelectModule,
    BaseChartDirective
  ],
  templateUrl: './binominal.html',
  styleUrl: './binominal.css'
})
export class Binominal implements OnInit {
  private fileDataService = inject(FileDataService);

  // Tipo de distribución
  tipoDistribucion: 'binomial' | 'hipergeometrica' = 'binomial';
  usarProbabilidad = signal(true); // true: usa p, false: usa k
  dataFromFile = signal(false);
  selectedKState = signal<string>('');

  // Comparación entre distribuciones
  mostrarComparacion = signal(false);
  datosComparacion: DistributionComparison | null = null;

  // Aceptación por lotes
  usarAceptacionPorLotes = signal(false);
  porcentajeAceptacion = 0;
  filaAceptacion: DistributionRow | null = null; // Referencia a la fila aceptada

  // Parámetros
  N = 0;
  n = 0;
  p = 0;
  k = 0; // Éxitos en la población (hipergeométrica)
  xRango = ''; // Puede ser: "5", "0-3", ">3", "<5", ">=2"

  constructor() {
    // Efecto para monitorear cambios en los datos del servicio
    effect(() => {
      const fileData = this.fileDataService.getFileData();
      if (fileData) {
        this.N = fileData.N;
        this.k = fileData.K;
        this.p = fileData.p || (fileData.K / fileData.N);
        this.selectedKState.set(fileData.selectedKState || 'archivo');
        
        // Determinar el tipo de distribución inicial
        if (fileData.distributionType === 'binomial') {
          this.tipoDistribucion = 'binomial';
          this.usarProbabilidad.set(true);
          console.log('Binomial - p:', this.p, 'K:', this.k);
        } else {
          this.tipoDistribucion = 'hipergeometrica';
          this.usarProbabilidad.set(false);
          console.log('Hipergeométrica - K:', this.k, 'p:', this.p);
        }
        
        this.dataFromFile.set(true);
        console.log('Datos cargados del archivo:', { 
          N: this.N, 
          K: this.k, 
          p: this.p,
          distributionType: fileData.distributionType,
          selectedKState: this.selectedKState()
        });
      }
    });
  }

  ngOnInit(): void {
    // Inicialización si es necesaria
  }

  // Estadísticos
  poblacionInfinita = true;
  tipoCalculoActual = ''; // 'infinita', 'finita', 'hipergeometrica'
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

  calcular() {
    // Validaciones iniciales
    if (this.N <= 0) {
      alert('N (población) debe ser mayor a 0');
      return;
    }

    if (this.n <= 0 || this.n > this.N) {
      alert(`n (muestra) debe estar entre 1 y ${this.N}`);
      return;
    }

    if (!this.xRango.trim()) {
      alert('x (valor o rango) es requerido');
      return;
    }

    const porcentajeMuestra = (this.n / this.N) * 100;

    if (this.mostrarComparacion()) {
      // Modo comparación: calcular ambas distribuciones
      this.calcularComparacion();
    } else {
      // Modo normal: calcular según selección
      // Si está en binomial pero n/N >= 20%, sugerir cambiar a hipergeométrica
      if (this.usarProbabilidad() && porcentajeMuestra >= 20) {
        const cambio = confirm(
          `⚠ n/N = ${porcentajeMuestra.toFixed(2)}% >= 20%\n\n` +
          `Para esta relación se recomienda usar Hipergeométrica.\n\n` +
          `¿Desea cambiar a Hipergeométrica?`
        );
        if (cambio) {
          this.usarProbabilidad.set(false);
          this.tipoDistribucion = 'hipergeometrica';
        } else {
          alert('Continuando con Binomial. Tenga en cuenta que la aproximación puede no ser óptima.');
        }
      }

      // Si está en hipergeométrica pero n/N < 20%, sugerir cambiar a binomial
      if (!this.usarProbabilidad() && porcentajeMuestra < 20) {
        const cambio = confirm(
          `⚠ n/N = ${porcentajeMuestra.toFixed(2)}% < 20%\n\n` +
          `Para esta relación se recomienda usar Binomial.\n\n` +
          `¿Desea cambiar a Binomial?`
        );
        if (cambio) {
          this.usarProbabilidad.set(true);
          this.tipoDistribucion = 'binomial';
        } else {
          alert('Continuando con Hipergeométrica.');
        }
      }

      // Si el usuario elige usar probabilidad (p), usa Binomial
      // Si elige usar éxitos (k), usa Hipergeométrica
      if (this.usarProbabilidad()) {
        // Determinar si es infinita o finita basado en n/N
        if (porcentajeMuestra < 5) {
          this.tipoCalculoActual = 'infinita';
        } else if (porcentajeMuestra <= 20) {
          this.tipoCalculoActual = 'finita';
        } else {
          if (porcentajeMuestra >= 20) {
            alert(`Para n/N = ${porcentajeMuestra.toFixed(2)}% (> 20%), la aproximación binomial puede no ser precisa.`);
          }
        }
        this.calcularBinomial();
      } else {
        this.tipoCalculoActual = 'hipergeometrica';
        this.calcularHipergeometrica();
      }
    }
  }

  private calcularComparacion() {
    // Parse y validar x
    const valoresX = this.parseXRango();
    if (!this.xValido) {
      alert(this.xMensaje);
      return;
    }

    this.datosComparacion = {
      binomial: this.calcularDistribucionBinomial(valoresX),
      hipergeometrica: this.calcularDistribucionHipergeometrica(valoresX)
    };
  }

  private calcularDistribucionBinomial(valoresX: number[]): DistributionComparison['binomial'] {
    // Validaciones
    if (this.p < 0 || this.p > 1) {
      alert('p debe estar entre 0 y 1');
      return this.crearDistribucionVacia('infinita');
    }

    const porcentajeMuestra = (this.n / this.N) * 100;
    let tipoCalculoActual = '';

    if (porcentajeMuestra < 5) {
      tipoCalculoActual = 'infinita';
    } else if (porcentajeMuestra <= 20) {
      tipoCalculoActual = 'finita';
    } else {
      tipoCalculoActual = 'infinita';
    }

    this.poblacionInfinita = tipoCalculoActual === 'infinita';

    const dataSource: DistributionRow[] = [];
    let acumuladaTotal = 0;

    // Calcular distribución para todos los valores 0 a n
    const distribucionCompleta: DistributionRow[] = [];
    for (let x = 0; x <= this.n; x++) {
      const px = this.binomial(this.n, x, this.p);
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
    const dataSourceFiltrado = distribucionCompleta.filter(row => valoresX.includes(row.x));

    if (dataSourceFiltrado.length === 0) {
      return this.crearDistribucionVacia(tipoCalculoActual);
    }

    // Recalcular acumulada según el rango filtrado
    let acumuladaFiltrada = 0;
    for (let row of dataSourceFiltrado) {
      acumuladaFiltrada += row.probabilidad;
      row.acumulada = acumuladaFiltrada;
      row.porcentajeAcumulado = acumuladaFiltrada * 100;
    }

    // Calcular estadísticos
    const media = this.n * this.p;
    const varianzaInfinita = this.n * this.p * (1 - this.p);
    const desviacion = Math.sqrt(varianzaInfinita);
    let factorCorreccion = 1;
    let desviacionFinita = desviacion;

    if (tipoCalculoActual === 'finita' && this.N > 1) {
      factorCorreccion = Math.sqrt((this.N - this.n) / (this.N - 1));
      desviacionFinita = desviacion * factorCorreccion;
    }

    const varianzaReal = tipoCalculoActual === 'infinita'
      ? varianzaInfinita
      : varianzaInfinita * (factorCorreccion ** 2);

    let sesgo = 0;
    let curtosis = 0;

    if (varianzaReal !== 0) {
      const sigmaReal = Math.sqrt(varianzaReal);
      sesgo = (1 - 2 * this.p) / sigmaReal;
      curtosis = (1 - 6 * this.p * (1 - this.p)) / varianzaReal;
    }

    sesgo = +sesgo.toFixed(2);
    curtosis = +curtosis.toFixed(2);

    const interpretacionSesgo = sesgo === 0.00 ? 'Neutro (Simétrica)' : 
                                sesgo > 0 ? 'Positivo (Asimetría derecha)' : 
                                'Negativo (Asimetría izquierda)';
    const interpretacionCurtosis = curtosis === 0.00 ? 'Mesocúrtica' : 
                                   curtosis > 0 ? 'Leptocúrtica' : 
                                   'Platicúrtica';

    // Gráficas
    const labels = dataSourceFiltrado.map(d => `x=${d.x}`);
    const porcentajes = dataSourceFiltrado.map(d => +d.porcentaje.toFixed(4));
    const porcentajesAcumulados = dataSourceFiltrado.map(d => +d.porcentajeAcumulado.toFixed(4));

    const barChartData: ChartConfiguration<'bar'>['data'] = {
      labels: labels,
      datasets: [{
        data: porcentajes,
        label: 'P(x) %'
      }]
    };

    const lineChartData: ChartConfiguration<'line'>['data'] = {
      labels: labels,
      datasets: [{
        data: porcentajesAcumulados,
        label: 'P(x) % acumulada',
        fill: false,
        pointRadius: 10,
        pointHoverRadius: 14
      }]
    };

    return {
      dataSource: dataSourceFiltrado,
      media,
      desviacion,
      desviacionFinita,
      factorCorreccion,
      sesgo,
      interpretacionSesgo,
      curtosis,
      interpretacionCurtosis,
      tipoCalculoActual,
      barChartData,
      lineChartData
    };
  }

  private calcularDistribucionHipergeometrica(valoresX: number[]): DistributionComparison['hipergeometrica'] {
    // Validaciones
    if (this.k < 0 || this.k > this.N) {
      alert(`k (éxitos en población) debe estar entre 0 y ${this.N}`);
      return this.crearDistribucionVacia('hipergeometrica');
    }
    if(this.k === 0){
      this.k = this.p * this.N
    }

    const xMin = Math.max(0, this.n + this.k - this.N);
    const xMax = Math.min(this.n, this.k);

    const dataSource: DistributionRow[] = [];
    let acumuladaTotal = 0;

    // Calcular distribución hipergeométrica
    const distribucionCompleta: DistributionRow[] = [];
    for (let x = xMin; x <= xMax; x++) {
      const px = this.hipergeometrica(this.N, this.k, this.n, x);
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
    const dataSourceFiltrado = distribucionCompleta.filter(row => valoresX.includes(row.x));

    if (dataSourceFiltrado.length === 0) {
      return this.crearDistribucionVacia('hipergeometrica');
    }

    // Recalcular acumulada según el rango filtrado
    let acumuladaFiltrada = 0;
    for (let row of dataSourceFiltrado) {
      acumuladaFiltrada += row.probabilidad;
      row.acumulada = acumuladaFiltrada;
      row.porcentajeAcumulado = acumuladaFiltrada * 100;
    }

    // Calcular estadísticos
    const media = (this.n * this.k) / this.N;
    const pHiper = this.k / this.N;
    const qHiper = 1 - pHiper;
    const varianza = (this.n * pHiper * qHiper * (this.N - this.n)) / (this.N - 1);
    const desviacion = Math.sqrt(varianza);
    const desviacionFinita = desviacion;
    const factorCorreccion = 1;

    let sesgo = 0;
    let curtosis = 0;

    if (desviacion !== 0) {
      sesgo = ((qHiper - pHiper) * (this.N - 2 * this.n)) / ((this.N - 2) * desviacion);

      // Curtosis correcta para hipergeométrica
      // γ₂ = [(N-1)*N² * (N*(N+1) - 6*n*(N-n)) - 6*n*(N-n)*(N²-3)] / [n*K*(N-K)*(N-n)*(N-2)*(N-3)] - 3
      const termino1 = (this.N - 1) * Math.pow(this.N, 2) * (this.N * (this.N + 1) - 6 * this.n * (this.N - this.n));
      const termino2 = 6 * this.n * (this.N - this.n) * (Math.pow(this.N, 2) - 3);
      const numerador = termino1 - termino2;
      const denominador = this.n * this.k * (this.N - this.k) * (this.N - this.n) * (this.N - 2) * (this.N - 3);

      if (denominador !== 0) {
        curtosis = (numerador / denominador) - 3;
      } else {
        curtosis = 0;
      }
    }

    sesgo = +sesgo.toFixed(2);
    curtosis = +curtosis.toFixed(2);

    const interpretacionSesgo = sesgo === 0.00 ? 'Neutro (Simétrica)' : 
                                sesgo > 0 ? 'Positivo (Asimetría derecha)' : 
                                'Negativo (Asimetría izquierda)';
    const interpretacionCurtosis = curtosis === 0.00 ? 'Mesocúrtica' : 
                                   curtosis > 0 ? 'Leptocúrtica' : 
                                   'Platicúrtica';

    // Gráficas
    const labels = dataSourceFiltrado.map(d => `x=${d.x}`);
    const porcentajes = dataSourceFiltrado.map(d => +d.porcentaje.toFixed(4));
    const porcentajesAcumulados = dataSourceFiltrado.map(d => +d.porcentajeAcumulado.toFixed(4));

    const barChartData: ChartConfiguration<'bar'>['data'] = {
      labels: labels,
      datasets: [{
        data: porcentajes,
        label: 'P(x) %'
      }]
    };

    const lineChartData: ChartConfiguration<'line'>['data'] = {
      labels: labels,
      datasets: [{
        data: porcentajesAcumulados,
        label: 'P(x) % acumulada',
        fill: false,
        pointRadius: 10,
        pointHoverRadius: 14
      }]
    };

    return {
      dataSource: dataSourceFiltrado,
      media,
      desviacion,
      desviacionFinita,
      factorCorreccion,
      sesgo,
      interpretacionSesgo,
      curtosis,
      interpretacionCurtosis,
      tipoCalculoActual: 'hipergeometrica',
      barChartData,
      lineChartData
    };
  }

  private crearDistribucionVacia(tipo: string) {
    return {
      dataSource: [],
      media: 0,
      desviacion: 0,
      desviacionFinita: 0,
      factorCorreccion: 1,
      sesgo: 0,
      interpretacionSesgo: '',
      curtosis: 0,
      interpretacionCurtosis: '',
      tipoCalculoActual: tipo,
      barChartData: { labels: [], datasets: [{ data: [], label: 'P(x) %' }] },
      lineChartData: { labels: [], datasets: [{ data: [], label: 'P(x) % acumulada', fill: false }] }
    };
  }

  private calcularBinomial() {
    // Validar inputs
    if (this.p < 0 || this.p > 1) {
      alert('p debe estar entre 0 y 1');
      return;
    }

    // Parse y validar x
    const valoresX = this.parseXRango();
    if (!this.xValido) {
      alert(this.xMensaje);
      return;
    }

    this.poblacionInfinita = this.tipoCalculoActual === 'infinita';

    this.dataSource = [];
    let acumuladaTotal = 0;

    // Calcular distribución para todos los valores 0 a n
    const distribucionCompleta: DistributionRow[] = [];
    for (let x = 0; x <= this.n; x++) {
      const px = this.binomial(this.n, x, this.p);
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
    this.calcularEstadisticosBinomial();
    this.actualizarGraficas();
  }

  private calcularHipergeometrica() {
    // Validar inputs específicos para hipergeométrica
    if (this.k < 0 || this.k > this.N) {
      alert(`k (éxitos en población) debe estar entre 0 y ${this.N}`);
      return;
    }

    // Parse y validar x
    const valoresX = this.parseXRango();
    if (!this.xValido) {
      alert(this.xMensaje);
      return;
    }

    this.poblacionInfinita = false;

    // El rango de x válido para hipergeométrica es: max(0, n+k-N) <= x <= min(n, k)
    const xMin = Math.max(0, this.n + this.k - this.N);
    const xMax = Math.min(this.n, this.k);

    this.dataSource = [];
    let acumuladaTotal = 0;

    // Calcular distribución hipergeométrica
    const distribucionCompleta: DistributionRow[] = [];
    for (let x = xMin; x <= xMax; x++) {
      const px = this.hipergeometrica(this.N, this.k, this.n, x);
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
    this.calcularEstadisticosHipergeometrica();
    this.actualizarGraficas();
  }

  private calcularEstadisticosBinomial() {
    // Media
    this.media = this.n * this.p;

    // Varianza infinita
    const varianzaInfinita = this.n * this.p * (1 - this.p);
    this.desviacion = Math.sqrt(varianzaInfinita);

    // Factor corrección (solo para población finita)
    this.factorCorreccion = 1;
    this.desviacionFinita = this.desviacion;

    if (this.tipoCalculoActual === 'finita' && this.N > 1) {
      this.factorCorreccion = Math.sqrt((this.N - this.n) / (this.N - 1));
      this.desviacionFinita = this.desviacion * this.factorCorreccion;
    }

    const varianzaReal = this.tipoCalculoActual === 'infinita'
      ? varianzaInfinita
      : varianzaInfinita * (this.factorCorreccion ** 2);

    // Sesgo y Curtosis
    if (varianzaReal === 0) {
      this.sesgo = 0;
      this.curtosis = 0;
    } else {
      const sigmaReal = Math.sqrt(varianzaReal);
      this.sesgo = (1 - 2 * this.p) / sigmaReal;
      this.curtosis = (1 - 6 * this.p * (1 - this.p)) / varianzaReal;
    }

    this.interpretarSesgo();
    this.interpretarCurtosis();
  }

  private calcularEstadisticosHipergeometrica() {
    // Media: μ = n * k / N
    this.media = (this.n * this.k) / this.N;

    // Probabilidad de éxito en hipergeométrica: p = k / N
    const pHiper = this.k / this.N;
    const qHiper = 1 - pHiper;

    // Varianza: σ² = n * p * q * (N - n) / (N - 1)
    const varianza = (this.n * pHiper * qHiper * (this.N - this.n)) / (this.N - 1);
    this.desviacion = Math.sqrt(varianza);

    // Para hipergeométrica, no hay "factor de corrección" separado, ya está en la fórmula
    this.desviacionFinita = this.desviacion;
    this.factorCorreccion = 1;

    // Sesgo
    if (this.desviacion === 0) {
      this.sesgo = 0;
      this.curtosis = 0;
    } else {
      // Sesgo: (Q - P) * (N - 2n) / ((N - 2) * σ)
      this.sesgo = ((qHiper - pHiper) * (this.N - 2 * this.n)) / ((this.N - 2) * this.desviacion);

      // Curtosis correcta para hipergeométrica
      // γ₂ = [(N-1)*N² * (N*(N+1) - 6*n*(N-n)) - 6*n*(N-n)*(N²-3)] / [n*K*(N-K)*(N-n)*(N-2)*(N-3)] - 3
      const termino1 = (this.N - 1) * Math.pow(this.N, 2) * (this.N * (this.N + 1) - 6 * this.n * (this.N - this.n));
      const termino2 = 6 * this.n * (this.N - this.n) * (Math.pow(this.N, 2) - 3);
      const numerador = termino1 - termino2;
      const denominador = this.n * this.k * (this.N - this.k) * (this.N - this.n) * (this.N - 2) * (this.N - 3);

      if (denominador === 0) {
        this.curtosis = 0;
      } else {
        this.curtosis = (numerador / denominador) - 3;
      }
    }

    this.interpretarSesgo();
    this.interpretarCurtosis();
  }

  private interpretarSesgo() {
    this.sesgo = +this.sesgo.toFixed(2);
    if (this.sesgo === 0.00) {
      this.interpretacionSesgo = 'Neutro (Simétrica)';
    } else if (this.sesgo > 0) {
      this.interpretacionSesgo = 'Positivo (Asimetría hacia la derecha)';
    } else {
      this.interpretacionSesgo = 'Negativo (Asimetría hacia la izquierda)';
    }
  }

  private interpretarCurtosis() {
    this.curtosis = +this.curtosis.toFixed(2);
    if (this.curtosis === 0.00) {
      this.interpretacionCurtosis = 'Mesocúrtica (Campana de Gauss)';
    } else if (this.curtosis > 0) {
      this.interpretacionCurtosis = 'Leptocúrtica (Más apuntada)';
    } else {
      this.interpretacionCurtosis = 'Platicúrtica (Más aplanada)';
    }
  }

  private parseXRango(): number[] {
    this.xValido = true;
    this.xMensaje = '';

    const x = this.xRango.trim();
    const valores: number[] = [];

    let maxX = this.n;
    if (this.tipoCalculoActual === 'hipergeometrica') {
      maxX = Math.min(this.n, this.k);
    }

    // Caso: "5" (valor único)
    if (/^=?\d+$/.test(x)) {
      const val = parseInt(x.replace('=', ''));
      if (val < 0 || val > maxX) {
        this.xValido = false;
        this.xMensaje = `x debe estar entre 0 y ${maxX}`;
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
      if (fin > maxX) {
        this.xValido = false;
        this.xMensaje = `El rango no puede exceder ${maxX}`;
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

    // Calcular aceptación por lotes si está habilitada
    if (this.usarAceptacionPorLotes()) {
      this.calcularAceptacion();
    } else {
      this.filaAceptacion = null;
    }
  }

  private calcularAceptacion() {
    if (this.porcentajeAceptacion <= 0 || this.porcentajeAceptacion > 100) {
      this.filaAceptacion = null;
      return;
    }

    let filaSeleccionada: DistributionRow | null = null;
    let mejorDiferencia = Infinity;

    // Buscar la fila con porcentaje acumulado más cercano sin exceder
    for (const fila of this.dataSource) {
      if (fila.porcentajeAcumulado <= this.porcentajeAceptacion) {
        const diferencia = this.porcentajeAceptacion - fila.porcentajeAcumulado;
        if (diferencia < mejorDiferencia) {
          mejorDiferencia = diferencia;
          filaSeleccionada = fila;
        }
      }
    }

    this.filaAceptacion = filaSeleccionada;
  }


  // ---------- Matemática ----------
  private binomial(n: number, x: number, p: number): number {
    return this.combinatoria(n, x) *
      Math.pow(p, x) *
      Math.pow(1 - p, n - x);
  }

  private hipergeometrica(N: number, k: number, n: number, x: number): number {
    // P(X = x) = C(k, x) * C(N-k, n-x) / C(N, n)
    const numerador = this.combinatoria(k, x) * this.combinatoria(N - k, n - x);
    const denominador = this.combinatoria(N, n);
    
    if (denominador === 0) return 0;
    return numerador / denominador;
  }

  private combinatoria(n: number, x: number): number {
    if (x < 0 || x > n) return 0;
    return this.factorial(n) /
      (this.factorial(x) * this.factorial(n - x));
  }

  private factorial(n: number): number {
    let r = 1;
    for (let i = 2; i <= n; i++) r *= i;
    return r;
  }
}

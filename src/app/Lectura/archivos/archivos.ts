import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatSelectModule } from '@angular/material/select';
import { MatRadioModule } from '@angular/material/radio';
import { FormsModule } from '@angular/forms';
import * as XLSX from 'xlsx';
import { FileDataService } from '../../Services/file-data.service';
import { Router } from '@angular/router';
import { Simulation } from '../../Services/simulation';

export interface FilaData {
  [key: string]: any;
}

@Component({
  selector: 'app-archivos',
  standalone: true,
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatTableModule,
    MatSelectModule,
    MatRadioModule,
    FormsModule,
  ],
  templateUrl: './archivos.html',
  styleUrl: './archivos.css',
})
export class Archivos implements OnInit {

  private fileDataService = inject(FileDataService);
  private router = inject(Router);
  private simulationService = inject(Simulation);

  fileContent = signal('');
  fileName = signal('');
  tableData = signal<FilaData[]>([]);
  displayedColumns: string[] = [];
  availableColumns = signal<string[]>([]);

  // Supabase
  simulations = signal<any[]>([]);
  selectedSimulationId = signal<number | null>(null);
  selectedScenario = signal<number>(1);

  // Selectores
  selectedNColumn = signal<string | null>(null);
  selectedKColumn = signal<string | null>(null);
  selectedKState = signal<string>('');
  distributionType = signal<'binomial' | 'hipergeometrica'>('binomial');

  availableKStates = signal<string[]>([]);

  processedN = signal(0);
  processedK = signal(0);
  processedP = signal(0);

  showColumnSelectors = signal(false);
  showStateSelector = signal(false);
  showProcessedResult = signal(false);

  calculatedLambda = signal(0);
  calculatedMiu = signal(0);
  showColaDialog = signal(false);

  async ngOnInit(): Promise<void> {
    await this.loadSimulations();
  }

  async loadSimulations(): Promise<void> {
    try {
      const data = await this.simulationService.getSimulaciones();
      this.simulations.set(data || []);
    } catch (error) {
      console.error('Error cargando simulaciones:', error);
    }
  }

  async loadSimulationScenario(): Promise<void> {
    const simulationId = this.selectedSimulationId();
    const scenario = this.selectedScenario();

    if (!simulationId) {
      alert('Seleccione una simulación');
      return;
    }

    try {
      const data = await this.simulationService.getEscenario(simulationId, scenario);
      console.log(data)
      if (!data || data.length === 0) {
        alert('No hay datos para esta simulación/escenario');
        return;
      }

      this.tableData.set(data);

      const headers = Object.keys(data[0]);
      this.displayedColumns = headers;
      this.availableColumns.set(headers);

      this.showColumnSelectors.set(true);

      this.fileName.set(`Simulación ${simulationId} - Escenario ${scenario}`);

      this.showStateSelector.set(false);
      this.showProcessedResult.set(false);
      this.selectedNColumn.set(null);
      this.selectedKColumn.set(null);
      this.selectedKState.set('');

    } catch (error) {
      console.error('Error cargando escenario:', error);
    }
  }

  // =========================
  // TU LÓGICA ORIGINAL
  // =========================

  Lector(event: any): void {
    const file: File = event.target.files[0];
    if (!file) return;

    this.fileName.set(file.name);
    const ext = file.name.split('.').pop()?.toLowerCase();

    if (ext === 'csv') {
      this.leerCSV(file);
    } else if (ext === 'xlsx' || ext === 'xls') {
      this.leerExcel(file);
    }
  }

  private leerCSV(file: File): void {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      this.fileContent.set(content);
      this.procesarDatos(content);
    };
    reader.readAsText(file);
  }

  private leerExcel(file: File): void {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const content = XLSX.utils.sheet_to_csv(firstSheet);
      this.fileContent.set(content);
      this.procesarDatos(content);
    };
    reader.readAsArrayBuffer(file);
  }

  private procesarDatos(content: string): void {
    const lineas = content.trim().split('\n');
    const datos: FilaData[] = [];
    let headers: string[] = [];

    let inicio = 0;

    if (lineas.length > 0) {
      const primeraLinea = lineas[0].split(',').map(col => col.trim());
      headers = primeraLinea;

      if (isNaN(parseInt(primeraLinea[0], 10))) {
        inicio = 1;
      } else {
        headers = primeraLinea.map((_, i) => `Columna ${i + 1}`);
      }
    }

    for (let i = inicio; i < lineas.length; i++) {
      const columnas = lineas[i].split(',').map(col => col.trim());

      if (columnas.length > 0 && columnas[0]) {
        const fila: FilaData = {};

        headers.forEach((header, index) => {
          fila[header] = columnas[index] || '';
        });

        datos.push(fila);
      }
    }

    this.tableData.set(datos);
    this.displayedColumns = headers;
    this.availableColumns.set(headers);
    this.showColumnSelectors.set(true);
  }

  // PEGA ESTOS 3 MÉTODOS DENTRO DE TU CLASE Archivos
  // (seguramente desaparecieron o quedaron fuera de la clase al integrar Supabase)

  onColumnsSelected(): void {
    const nCol = this.selectedNColumn();
    const kCol = this.selectedKColumn();

    if (!nCol || !kCol) {
      console.error('Debe seleccionar ambas columnas');
      return;
    }

    const data = this.tableData();

    // N = total de filas válidas de la columna seleccionada
    const nValues = data
      .map(row => row[nCol])
      .filter(val => val !== undefined && val !== null && val !== '');

    const N = nValues.length;

    // Estados únicos de K
    const kValues = data
      .filter(row => row[kCol] !== undefined && row[kCol] !== null && row[kCol] !== '')
      .map(row => row[kCol].toString().toLowerCase().trim());

    const uniqueKStates = Array.from(new Set(kValues));

    this.processedN.set(N);
    this.availableKStates.set(uniqueKStates);

    // Mostrar siguiente paso
    this.showStateSelector.set(true);
    this.showProcessedResult.set(false);

    console.log('N (filas):', N);
    console.log('Estados únicos K:', uniqueKStates);
  }


  onStateSelected(): void {
    const selectedState = this.selectedKState();
    const kCol = this.selectedKColumn();

    if (!selectedState || !kCol) {
      console.error('Debe seleccionar un estado de K');
      return;
    }

    const data = this.tableData();

    const kValues = data
      .filter(row => row[kCol] !== undefined && row[kCol] !== null && row[kCol] !== '')
      .map(row => row[kCol].toString().toLowerCase().trim());

    // Conteo de éxitos
    const K = kValues.filter(val => val === selectedState).length;

    this.processedK.set(K);
    this.processedP.set(this.processedN() > 0 ? K / this.processedN() : 0);

    this.showProcessedResult.set(true);

    console.log('Estado seleccionado:', selectedState);
    console.log('K:', K);
  }


  sendToBinomial(): void {
    const N = this.processedN();
    const K = this.processedK();
    const type = this.distributionType();

    if (N <= 0 || K <= 0) {
      console.error('Datos inválidos para enviar');
      alert('N y K deben ser mayores a 0');
      return;
    }

    const p = K / N;

    this.fileDataService.setFileData({
      N,
      K,
      p,
      distributionType: type,
      selectedKState: this.selectedKState() || undefined
    });

    console.log('Datos enviados:', {
      N,
      K,
      p,
      distributionType: type
    });

    this.router.navigate(['/discretos/binominal']);
  }

  // ===========================
  // MÉTODOS PARA COLAS
  // ===========================

  /**
   * Convierte tiempo en formato HH:MM:SS a segundos
   * @param timeStr Cadena en formato "HH:MM:SS"
   * @returns Tiempo en segundos
   */
  private timeToSeconds(timeStr: string | number): number {
    if (typeof timeStr === 'number') return timeStr;
    
    const str = String(timeStr).trim();
    if (!str) return 0;

    const parts = str.split(':');
    if (parts.length === 3) {
      // Formato HH:MM:SS
      const hours = parseInt(parts[0], 10) || 0;
      const minutes = parseInt(parts[1], 10) || 0;
      const seconds = parseInt(parts[2], 10) || 0;
      return hours * 3600 + minutes * 60 + seconds;
    } else if (parts.length === 2) {
      // Formato MM:SS (retrocompatibilidad)
      const minutes = parseInt(parts[0], 10) || 0;
      const seconds = parseInt(parts[1], 10) || 0;
      return minutes * 60 + seconds;
    }
    return 0;
  }

  /**
   * Calcula lambda (λ) - tasa de llegada de órdenes
   * λ = número de órdenes / tiempo total de operación en horas
   */
  private calculateLambda(): number {
  const data = this.tableData();
  if (data.length === 0) return 0;

  const simulationId = this.selectedSimulationId();

  if (!simulationId) {
    console.error('No hay simulación seleccionada');
    return 0;
  }

  const simulation = this.simulations().find(
    sim => sim.idSimulacion === simulationId
  );

  if (!simulation || !simulation.horas || simulation.horas <= 0) {
    console.error('No hay horas válidas para la simulación');
    return 0;
  }

  // Detectar jornadas:
  // Cada no_orden = 1 inicia un nuevo día
  const totalDays = data.filter(row => Number(row['no_orden']) === 1).length;

  if (totalDays === 0) {
    console.error('No se detectaron jornadas');
    return 0;
  }

  // Horas por jornada
  const hoursPerDay = simulation.horas / totalDays;

  // Agrupar clientes por jornada
  const dailyCounts: number[] = [];
  let currentDayCount = 0;

  data.forEach((row, index) => {
    const noOrden = Number(row['no_orden']);

    // Nuevo día (excepto primera fila)
    if (noOrden === 1 && index !== 0) {
      dailyCounts.push(currentDayCount);
      currentDayCount = 0;
    }

    currentDayCount++;
  });

  // Último día
  if (currentDayCount > 0) {
    dailyCounts.push(currentDayCount);
  }

  if (dailyCounts.length === 0) return 0;

  // λ por día (clientes/hora)
  const dailyLambdas = dailyCounts.map(
    clients => clients / hoursPerDay
  );

  // Promedio final
  const lambda =
    dailyLambdas.reduce((sum, val) => sum + val, 0) / dailyLambdas.length;

  console.log('Clientes por jornada:', dailyCounts);
  console.log('Lambdas diarios:', dailyLambdas.map(l => l.toFixed(2)));
  console.log(`Lambda promedio final: ${lambda.toFixed(2)} clientes/hora`);

  return lambda;
}

  /**
   * Calcula miu (μ) - tasa de servicio
   * μ = capacidad de servicio = 3600 segundos / promedio de tiempo de servicio
   */
  private calculateMiu(): number {
  const data = this.tableData();
  if (data.length === 0) return 0;

  let totalServiceTime = 0;
  let serviceCount = 0;

  data.forEach(row => {
    const atendida = this.timeToSeconds(row['atendida']);
    const salida = this.timeToSeconds(row['salida']);

    if (salida > atendida) {
      const serviceTime = salida - atendida;
      totalServiceTime += serviceTime;
      serviceCount++;
    }
  });

  if (serviceCount === 0 || totalServiceTime === 0) return 0;

  const avgServiceTime = totalServiceTime / serviceCount;

  const miu = 3600 / avgServiceTime;

  console.log(`Miu calculada: ${miu.toFixed(2)} clientes/hora`);
  return miu;
}

  sendToColas(): void {
    const lambda = this.calculateLambda();
    const miu = this.calculateMiu();

    if (lambda <= 0 || miu <= 0) {
      console.error('No se pudieron calcular lambda o miu');
      alert('No se pudieron calcular lambda o miu. Verifica que los datos de tiempo sean válidos (formato HH:MM:SS)');
      return;
    }

    // Guardar valores calculados para edición
    this.calculatedLambda.set(lambda);
    this.calculatedMiu.set(miu);

    // Mostrar diálogo para confirmar o editar valores
    this.showColaDialog.set(true);

    console.log('Valores calculados:', {
      lambda: lambda.toFixed(2),
      miu: miu.toFixed(2)
    });
  }

  confirmColaData(): void {
    const lambda = this.calculatedLambda();
    const miu = this.calculatedMiu();

    // Validar que λ < μ
    if (lambda >= miu) {
      alert(`Sistema inestable: λ (${lambda.toFixed(2)}) debe ser menor que μ (${miu.toFixed(2)})`);
      return;
    }

    this.fileDataService.setFileData({
      lambda,
      miu,
      distributionType: 'cola'
    });

    console.log('Datos confirmados y enviados a Colas:', {
      lambda: lambda.toFixed(2),
      miu: miu.toFixed(2)
    });

    this.showColaDialog.set(false);
    this.router.navigate(['/discretos/colas']);
  }

  cancelColaDialog(): void {
    this.showColaDialog.set(false);
  }
}

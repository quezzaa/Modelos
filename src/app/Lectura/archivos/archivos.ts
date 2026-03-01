import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCard, MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatSelectModule } from '@angular/material/select';
import { MatRadioModule } from '@angular/material/radio';
import { FormsModule } from '@angular/forms';
import * as XLSX from 'xlsx';
import { FileDataService } from '../../Services/file-data.service';
import { Router } from '@angular/router';

export interface FilaData {
  [key: string]: any;
}

@Component({
  selector: 'app-archivos',
  imports: [CommonModule,
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
export class Archivos {
  private fileDataService = inject(FileDataService);
  private router = inject(Router);
  fileContent = signal('');
  fileName = signal('');
  tableData = signal<FilaData[]>([]);
  displayedColumns: string[] = [];
  availableColumns = signal<string[]>([]);
  
  // Selectores de columnas
  selectedNColumn = signal<string | null>(null);
  selectedKColumn = signal<string | null>(null);
  selectedKState = signal<string>('');
  distributionType = signal<'binomial' | 'hipergeometrica'>('binomial');
  
  // Estados únicos de K disponibles
  availableKStates = signal<string[]>([]);
  
  // Datos procesados finales
  processedN = signal(0);
  processedK = signal(0);
  processedP = signal(0);
  showColumnSelectors = signal(false);
  showStateSelector = signal(false);
  showProcessedResult = signal(false);

  Lector(event: any): void {
    const file: File = event.target.files[0];
    if (file) {
      this.fileName.set(file.name);
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      
      if (fileExtension === 'csv') {
        this.leerCSV(file);
      } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
        this.leerExcel(file);
      } else {
        console.error('Archivo no soportado. Por favor, seleccione un archivo .csv, .xlsx o .xls.');
      }
    } else {
      console.error('No se seleccionó ningún archivo.');
    }
  }

  private leerCSV(file: File): void {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      this.fileContent.set(content);
      this.procesarDatos(content);
    }
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
    }
    reader.readAsArrayBuffer(file);
  }

  private procesarDatos(content: string): void {
    const lineas = content.trim().split('\n');
    const datos: FilaData[] = [];
    let headers: string[] = [];

    // Detectar si la primera línea es encabezado
    let inicio = 0;
    if (lineas.length > 0) {
      const primeraLinea = lineas[0].split(',').map(col => col.trim());
      headers = primeraLinea;
      
      // Verificar si es un encabezado (si la primera columna no es un número)
      if (isNaN(parseInt(primeraLinea[0], 10))) {
        inicio = 1;
      } else {
        // Si no es encabezado, crear nombres genéricos
        headers = primeraLinea.map((_, i) => `Columna ${i + 1}`);
      }
    }

    // Procesar filas de datos
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
    console.log('Datos procesados:', datos);
    console.log('Columnas disponibles:', headers);
  }

  onColumnsSelected(): void {
    const nCol = this.selectedNColumn();
    const kCol = this.selectedKColumn();

    if (!nCol || !kCol) {
      console.error('Debe seleccionar ambas columnas');
      return;
    }

    const data = this.tableData();
    
    // Calcular N: cantidad de filas en la columna N (usando length, no contando valores)
    const nValues = data.map(row => row[nCol]).filter(val => val !== undefined && val !== '');
    const N = nValues.length;

    // Obtener y agrupar estados de K
    const kValues = data
      .filter(row => row[kCol] !== undefined && row[kCol] !== '')
      .map(row => row[kCol].toString().toLowerCase().trim());
    
    const uniqueKStates = Array.from(new Set(kValues));
    
    console.log('Estados únicos de K:', uniqueKStates);
    console.log('Total de estados:', uniqueKStates.length);

    this.processedN.set(N);
    this.availableKStates.set(uniqueKStates);
    this.showStateSelector.set(true);

    console.log('N (filas):', N);
  }

  onStateSelected(): void {
    const selectedState = this.selectedKState();
    const kCol = this.selectedKColumn();

    if (!selectedState || !kCol) {
      console.error('Debe seleccionar un estado de K');
      return;
    }

    const data = this.tableData();
    
    // Contar cuántas veces aparece el estado seleccionado
    const kValues = data
      .filter(row => row[kCol] !== undefined && row[kCol] !== '')
      .map(row => row[kCol].toString().toLowerCase().trim());
    
    const K = kValues.filter(val => val === selectedState).length;

    this.processedK.set(K);
    this.showProcessedResult.set(true);

    console.log('Estado K seleccionado:', selectedState, 'Cantidad:', K);
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

    // Enviar AMBOS p y K para permitir cambios entre distribuciones
    const p = K / N;

    this.fileDataService.setFileData({
      N,
      K,
      p,
      distributionType: type,
      selectedKState: this.selectedKState() || undefined
    });

    console.log('Datos enviados al servicio:', { N, K, p, distributionType: type });
    
    // Navegar a la ruta correcta
    this.router.navigate(['/discretos/binominal']);
  }
}

import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCard, MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import * as XLSX from 'xlsx';

export interface FilaData {
  N: number;
  K: string;
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
  ],
  templateUrl: './archivos.html',
  styleUrl: './archivos.css',
})
export class Archivos {
  fileContent = signal('');
  fileName = signal('');
  tableData = signal<FilaData[]>([]);
  displayedColumns: string[] = ['N', 'K'];

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

    let inicio = 1;
    if (lineas.length > 0) {
      const primeraLinea = lineas[0].toLowerCase();
      if (!primeraLinea.includes('n') && !primeraLinea.includes('k')) {
        inicio = 0;
      }
    }

    for (let i = inicio; i < lineas.length; i++) {
      const columnas = lineas[i].split(',').map(col => col.trim());
      if (columnas.length >= 2) {
        const n = parseInt(columnas[0], 10);
        const k = columnas[1];
        
        if (!isNaN(n) && k) {
          datos.push({ N: n, K: k });
        }
      }
    }

    this.tableData.set(datos);
    console.log('Datos procesados:', datos);
  }
}

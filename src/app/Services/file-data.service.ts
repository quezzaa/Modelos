import { Injectable } from '@angular/core';
import { signal } from '@angular/core';

export interface ProcessedFileData {
  N: number; // Número de filas (sample size)
  K: number; // Número de éxitos en la población
  p?: number; // Probabilidad calculada (p = K/N)
  distributionType: 'binomial' | 'hipergeometrica'; // Tipo de distribución
  selectedKState?: string; // Estado seleccionado de K
}

@Injectable({
  providedIn: 'root'
})
export class FileDataService {
  fileData = signal<ProcessedFileData | null>(null);

  setFileData(data: ProcessedFileData): void {
    this.fileData.set(data);
  }

  getFileData(): ProcessedFileData | null {
    return this.fileData();
  }

  clearFileData(): void {
    this.fileData.set(null);
  }
}

import { Injectable } from '@angular/core';
import { signal } from '@angular/core';

export interface ProcessedFileData {
  // Datos para Binomial/Hipergeométrica
  N?: number; // Número de filas (sample size)
  n?:number;
  K?: number; // Número de éxitos en la población
  p?: number; // Probabilidad calculada (p = K/N)
  distributionType?: 'binomial' | 'hipergeometrica' | 'cola'; // Tipo de distribución
  selectedKState?: string; // Estado seleccionado de K
  
  // Datos para Colas
  lambda?: number; // Tasa de llegada (λ)
  miu?: number; // Tasa de servicio (μ)
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

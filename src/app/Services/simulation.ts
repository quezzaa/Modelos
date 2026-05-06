import { Injectable } from '@angular/core';
import { supabase } from './supabase.client';

@Injectable({
  providedIn: 'root',
})
export class Simulation {

  async getSimulaciones() {
    const { data, error } = await supabase
      .from('tbSimulacion')
      .select('*')
      .order('fecha', { ascending: false });

    if (error) {
      console.error('Error en getSimulaciones:', error);
      throw error;
    }
    console.log('Simulaciones obtenidas:', data);
    return data;
  }

  async getEscenario(idSimulacion: number, escenario: number) {
  const tabla = `tbEscenario${escenario}`;

  const pageSize = 1000;
  let from = 0;
  let allData: any[] = [];
  let hasMore = true;

  while (hasMore) {
    const to = from + pageSize - 1;

    const { data, error } = await supabase
      .from(tabla)
      .select('*')
      .eq('idSimulacion', idSimulacion)
      .order('no_orden', { ascending: true })
      .range(from, to);

    if (error) {
      console.error(`Error en ${tabla}:`, error);
      throw error;
    }

    if (data && data.length > 0) {
      allData = [...allData, ...data];
    }

    // Si devuelve menos del límite, ya terminó
    if (!data || data.length < pageSize) {
      hasMore = false;
    } else {
      from += pageSize;
    }
  }

  return allData;
}
}
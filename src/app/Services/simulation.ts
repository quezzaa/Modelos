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

    return data;
  }

  async getEscenario(idSimulacion: number, escenario: number) {
    const tabla = `tbEscenario${escenario}`;

    const { data, error } = await supabase
      .from(tabla)
      .select('*')
      .eq('idSimulacion', idSimulacion)
      .order('no_orden', { ascending: true });

    if (error) {
      console.error(`Error en ${tabla}:`, error);
      throw error;
    }

    return data;
  }
}
import { Injectable } from '@angular/core';
import { Firestore, collection, addDoc, query, where, orderBy, getDocs, Timestamp } from '@angular/fire/firestore';
import MovimientoInventarioInterface from '../interfaces/movimiento-inventario.interface';

@Injectable({
  providedIn: 'root'
})
export class MovimientosInventarioService {
  private movimientosCollectionRef = collection(this.firestore, 'movimientosInventario');

  constructor(private firestore: Firestore) { }

  /**
   * Registrar un nuevo movimiento de inventario
   */
  registrarMovimiento(movimiento: MovimientoInventarioInterface) {
    return addDoc(this.movimientosCollectionRef, movimiento);
  }

  /**
   * Obtener movimientos por fecha
   */
  async obtenerMovimientosPorFecha(fecha: Date | string): Promise<MovimientoInventarioInterface[]> {
    // Si es string (del input date), parsearlo correctamente en hora local
    let fechaObj: Date;
    if (typeof fecha === 'string') {
      // Input date devuelve "YYYY-MM-DD", creamos la fecha en hora local
      const [year, month, day] = fecha.split('-').map(Number);
      fechaObj = new Date(year, month - 1, day);
    } else {
      fechaObj = fecha;
    }
    
    const inicioDelDia = new Date(fechaObj);
    inicioDelDia.setHours(0, 0, 0, 0);
    
    const finDelDia = new Date(fechaObj);
    finDelDia.setHours(23, 59, 59, 999);

    const q = query(
      this.movimientosCollectionRef,
      where('fecha', '>=', Timestamp.fromDate(inicioDelDia)),
      where('fecha', '<=', Timestamp.fromDate(finDelDia)),
      orderBy('fecha', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const movimientos: MovimientoInventarioInterface[] = [];

    querySnapshot.forEach((doc) => {
      movimientos.push({
        id: doc.id,
        ...doc.data()
      } as MovimientoInventarioInterface);
    });

    return movimientos;
  }

  /**
   * Obtener todos los movimientos ordenados por fecha descendente
   */
  async obtenerTodosLosMovimientos(): Promise<MovimientoInventarioInterface[]> {
    const q = query(
      this.movimientosCollectionRef,
      orderBy('fecha', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const movimientos: MovimientoInventarioInterface[] = [];

    querySnapshot.forEach((doc) => {
      movimientos.push({
        id: doc.id,
        ...doc.data()
      } as MovimientoInventarioInterface);
    });

    return movimientos;
  }

  /**
   * Obtener movimientos por rango de fechas
   */
  async obtenerMovimientosPorRango(fechaInicio: Date, fechaFin: Date): Promise<MovimientoInventarioInterface[]> {
    const inicio = new Date(fechaInicio);
    inicio.setHours(0, 0, 0, 0);
    
    const fin = new Date(fechaFin);
    fin.setHours(23, 59, 59, 999);

    const q = query(
      this.movimientosCollectionRef,
      where('fecha', '>=', Timestamp.fromDate(inicio)),
      where('fecha', '<=', Timestamp.fromDate(fin)),
      orderBy('fecha', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const movimientos: MovimientoInventarioInterface[] = [];

    querySnapshot.forEach((doc) => {
      movimientos.push({
        id: doc.id,
        ...doc.data()
      } as MovimientoInventarioInterface);
    });

    return movimientos;
  }
}

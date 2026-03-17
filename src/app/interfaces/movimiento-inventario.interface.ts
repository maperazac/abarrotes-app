import { Timestamp } from '@angular/fire/firestore';

export default interface MovimientoInventarioInterface {
  id?: string;
  fecha: Timestamp;
  idProducto: string;
  descripcionProducto: string;
  cantidadAnterior: number;
  cantidadMovimiento: number;
  cantidadNueva: number;
  tipo: 'ENTRADA' | 'SALIDA' | 'VENTA' | 'DEVOLUCION' | 'AJUSTE';
  idCajero: string;
  nombreCajero?: string;
  departamento?: string;
  nombreDepartamento?: string;
  observaciones?: string;
}

import { Timestamp } from '@angular/fire/firestore';

export default interface ClienteInterface {
  id?: string;
  numero?: string; // Número del cliente (puede ser auto-generado)
  nombre: string;
  direccion?: string;
  telefono?: string;
  limiteCredito?: number; // 0 = sin límite, cualquier otro número = límite específico
  saldoActual: number;
  fechaRegistro: Timestamp;
  activo: boolean;
  notas?: string;
}

export interface VentaCreditoInterface {
  id?: string;
  idVenta: string;
  idCliente: string;
  fechaVenta: Timestamp;
  total: number;
  saldoPendiente: number;
  productos: ProductoVentaCredito[];
  liquidada: boolean;
  abonos?: AbonoInterface[];
}

export interface ProductoVentaCredito {
  descripcion: string;
  precioVenta: number;
  cantidad: number;
  importe: number;
}

export interface AbonoInterface {
  id?: string;
  idVentaCredito: string;
  idCliente: string;
  monto: number;
  fecha: Timestamp;
  idCajero: string;
  nombreCajero: string;
  observaciones?: string;
}

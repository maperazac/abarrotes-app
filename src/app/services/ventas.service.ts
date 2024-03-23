import { EventEmitter, Injectable } from '@angular/core';
import ProductoInterface from '../interfaces/productos.interface';

@Injectable({
  providedIn: 'root'
})
export class VentasService {

  constructor() { }

  $productosVentaActual = new EventEmitter<ProductoInterface[]>();
}

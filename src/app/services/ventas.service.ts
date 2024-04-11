import { EventEmitter, Injectable } from '@angular/core';
import { Firestore, collection, addDoc, query, orderBy, getDocs, where, doc, getDoc, deleteDoc, updateDoc } from '@angular/fire/firestore';
import ProductoInterface from '../interfaces/productos.interface';
import VentaInterface from '../interfaces/ventas.interface';

@Injectable({
  providedIn: 'root'
})
export class VentasService {
  ventasCollectionRef = collection(this.firestore, 'ventas');
  constructor(private firestore: Firestore) { }

  $productosVentaActual = new EventEmitter<ProductoInterface[]>();

  crearVenta(venta: VentaInterface) {
    return addDoc(this.ventasCollectionRef, venta);
  }

  async obtenerVentas() {
    const q = query(this.ventasCollectionRef, orderBy('fecha'))
    const dep = await getDocs(q)
    return dep;
  }
}

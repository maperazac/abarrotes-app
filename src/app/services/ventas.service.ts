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

  $ventasActuales = new EventEmitter<VentaInterface[]>();

  guardarVenta(venta: VentaInterface) {
    return addDoc(this.ventasCollectionRef, venta);
  }

  async obtenerVentas() {
    const q = query(this.ventasCollectionRef, orderBy('fecha'))
    const dep = await getDocs(q)
    return dep;
  }

  agregarVentaLocalstorage(venta: VentaInterface) {
    debugger;
    let ventas: VentaInterface[] = []; 
    const ventasActuales = JSON.parse(localStorage.getItem("ventasLS")); // obtiene lo que hay actualmente en el localstorage de ventas, en caso de que ya haya ventas.
    
    if(ventasActuales != null) {
      ventasActuales.push(venta); // Si ya habia algo en el localstorage, le agrega la nueva venta al array de ventas
      localStorage.setItem("ventasLS", JSON.stringify(ventasActuales)); // Actualiza el localstorage con la nueva venta agregada
    } else {
      ventas.push(venta);
      localStorage.setItem("ventasLS", JSON.stringify(ventas));
    }

    this.$ventasActuales.emit(JSON.parse(localStorage.getItem("ventasLS")))

  }
}

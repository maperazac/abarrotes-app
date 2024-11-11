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

  $idVentaActiva = new EventEmitter<number>();

  // Se va a usar para guardar la venta en base de datos. Se tiene que modificar
  // guardarVenta(venta: VentaInterface) {
  //   return addDoc(this.ventasCollectionRef, venta);
  // }

  // Se va a usar para obtener las ventas registradas y completadas en base de datos
  // async obtenerVentas() {  
  //   const q = query(this.ventasCollectionRef, orderBy('fecha'))
  //   const dep = await getDocs(q)
  //   return dep;
  // }

  agregarVentaLocalstorage(venta: VentaInterface) {
    let ventas: VentaInterface[] = []; 
    const ventasActuales = JSON.parse(localStorage.getItem("ventasLS")); // obtiene lo que hay actualmente en el localstorage de ventas, en caso de que ya haya ventas.
    
    if(ventasActuales != null) {
      ventasActuales.forEach(element => {
        element.seleccionada = 0;
      });
      venta.posicion = (ventasActuales.length + 1).toString();
      ventasActuales.push(venta); // Si ya habia algo en el localstorage, le agrega la nueva venta al array de ventas
      localStorage.setItem("ventasLS", JSON.stringify(ventasActuales)); // Actualiza el localstorage con la nueva venta agregada
    } else {
      venta.posicion = '1';
      ventas.push(venta);
      localStorage.setItem("ventasLS", JSON.stringify(ventas));
    }

    this.$ventasActuales.emit(JSON.parse(localStorage.getItem("ventasLS")));
  }

  eliminarVentaLocalStorage(idTemp: number) {
    const ventasActuales = JSON.parse(localStorage.getItem("ventasLS"));
    let item = ventasActuales.findIndex(i => i.idTemp === idTemp)
    ventasActuales.forEach((venta, index) => {
      if(index == item - 1) {
        venta.seleccionada = 1;
      }
    })

    let ventasActualesFiltradas = ventasActuales.filter(function(el) { return el.idTemp != idTemp; })
    localStorage.setItem("ventasLS", JSON.stringify(ventasActualesFiltradas));
    this.$ventasActuales.emit(JSON.parse(localStorage.getItem("ventasLS")));
  }

  obtenerVentaActivaLocalStorage() {
    const ventasActuales = JSON.parse(localStorage.getItem("ventasLS"));
    let ventaActiva;
    ventasActuales.forEach(element => {
      if(element.seleccionada == 1) {
        ventaActiva = element.idTemp;
      } 
    });
    return ventaActiva;
  }

  obtenerTodasLasVentasActuales() {
    const ventasActuales = JSON.parse(localStorage.getItem("ventasLS"));
    return ventasActuales;
  }

  setVentaActiva(id: number) {
    const ventasActuales = JSON.parse(localStorage.getItem("ventasLS"));
    ventasActuales.forEach(el => {
      el.seleccionada = el.idTemp == id ? 1 : 0;
    });
    localStorage.setItem("ventasLS", JSON.stringify(ventasActuales));
    this.$ventasActuales.emit(JSON.parse(localStorage.getItem("ventasLS")));
    this.$idVentaActiva.emit(id)
  }
}

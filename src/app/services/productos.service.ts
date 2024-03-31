import { Injectable } from '@angular/core';
import { Firestore, collection, addDoc, collectionData, deleteDoc, doc, getDocs, where, limit, orderBy, query, updateDoc } from '@angular/fire/firestore';
import { ProductoModel } from '../models/producto.model';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import ProductoInterface from '../interfaces/productos.interface';

@Injectable({
  providedIn: 'root'
})

export class ProductosService {
  productosCollectionRef = collection(this.firestore, 'productos');
  constructor(private firestore: Firestore,  private http: HttpClient) { }

  crearProducto(producto: ProductoInterface) {
    return addDoc(this.productosCollectionRef, producto);
  }

  async obtenerProductoPorCodigoDeBarras(codigoDeBarras: string)  {
    const q = await query(this.productosCollectionRef, where('codigoDeBarras', "==", codigoDeBarras))
    const producto = await getDocs(q)
    return producto;
  }

  async obtenerProductos() {
    const q = query(this.productosCollectionRef, orderBy('descripcion'))
    const prod = await getDocs(q)
    return prod;
  }

  borrarProducto(producto: ProductoInterface) {
    const productoDocRef = doc(this.firestore, `productos/${producto.id}`);
    return deleteDoc(productoDocRef);
  }

  modificarProducto(producto: ProductoInterface, id) {
    const productoDocRef = doc(this.firestore, `productos/${id}`);
    return updateDoc(productoDocRef, {
      codigoDeBarras: producto.codigoDeBarras,
      descripcion: producto.descripcion,
      seVende: producto.seVende,
      precioCosto: producto.precioCosto,
      ganancia: producto.ganancia,
      precioVenta: producto.precioVenta,
      precioMayoreo: producto.precioMayoreo,
      departamento: producto.departamento
    });
  }
}

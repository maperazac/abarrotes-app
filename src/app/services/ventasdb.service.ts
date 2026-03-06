import { EventEmitter, Injectable } from '@angular/core';
import { addDoc, collection, deleteDoc, doc, Firestore, getDocs, orderBy, query, Timestamp, updateDoc, where } from '@angular/fire/firestore';
import ProductoInterface from '../interfaces/productos.interface';
import VentaInterface from '../interfaces/ventas.interface';

@Injectable({
  providedIn: 'root'
})
export class VentasdbService {
  ventasCollectionRef = collection(this.firestore, 'ventas');
  detalleVentasCollectionRef = collection(this.firestore, 'detalleVentas');
  constructor(private firestore: Firestore) { }

  

  // Se va a usar para obtener las ventas registradas y completadas en base de datos
  // async obtenerVentas() {  
  //   const q = query(this.ventasCollectionRef, orderBy('fecha'))
  //   const dep = await getDocs(q)
  //   return dep;
  // }

  $ventasActuales = new EventEmitter<VentaInterface[]>();
  $idVentaActiva = new EventEmitter<number>();
  $idVentaActivaInterno = new EventEmitter<number>();
  $cambiandoDeVenta = new EventEmitter<boolean>(false);
  $productosVentaActual = new EventEmitter<ProductoInterface[]>();
  $ultimaVentaFinalizada = new EventEmitter<VentaInterface>();

  // Se usa para guardar la venta en curso (status = 0) en base de datos
  registrarNuevaVenta(venta: VentaInterface) {
    return addDoc(this.ventasCollectionRef, venta);
  }

  async obtenerVentasPorStatus(status: string)  {
    try {
      console.log('Consultando ventas con status:', status);
      // Primero intentar sin orderBy para evitar el error de índice
      // Se ordenará manualmente en el cliente
      const q = query(this.ventasCollectionRef, where('status', "==", status));
      const ventas = await getDocs(q);
      console.log('Ventas obtenidas:', ventas.size);
      return ventas;
    } catch (error: any) {
      console.error('Error en obtenerVentasPorStatus:', error);
      console.error('Código de error:', error.code);
      console.error('Detalles del error:', error.message);
      // Si el error es por falta de índice, Firebase proporciona un enlace
      if (error.message && error.message.includes('index')) {
        console.error('⚠️ NECESITAS CREAR UN ÍNDICE EN FIRESTORE');
        console.error('Busca el enlace en el error anterior para crear el índice automáticamente');
      }
      throw error;
    }
  }

  async obtenerVentasPorStatusYPeriodo(status: string, fechaInicio: Date, fechaFin: Date)  {
    const q = await query(this.ventasCollectionRef, where('status', "==", status), where('fechaVentaFinalizada', ">=", fechaInicio), where('fechaVentaFinalizada', "<=", fechaFin), orderBy('fechaVentaFinalizada'))
    const ventas = await getDocs(q)
    return ventas;
  }

  async obtenerVentasPorMultiplesStatusYPeriodo(statuses: string[], fechaInicio: Date, fechaFin: Date) {
    const q = await query(
      this.ventasCollectionRef, 
      where('status', 'in', statuses), 
      where('fechaVentaFinalizada', '>=', fechaInicio), 
      where('fechaVentaFinalizada', '<=', fechaFin), 
      orderBy('fechaVentaFinalizada', 'desc')
    );
    const ventas = await getDocs(q);
    return ventas;
  }

  // async getVentaActiva() {
  //   const q = query(this.ventasCollectionRef, where("seleccionada", "==", 1));
  //   const ventaActiva = await getDocs(q);
  //   return ventaActiva;
  // }

  async setVentaActiva(idInterno: string) {
    // this.$cambiandoDeVenta.emit(true);
    const q = query(this.ventasCollectionRef, where('status', "==", "0")); // Que obtenga solo las ventas con status = "0" (en curso)
    const querySnapshot = await getDocs(q);

    const ventas: any[] = [];

    querySnapshot.forEach((doc) => {
      ventas.push({
        id: doc.id,
        ...doc.data(),
        seleccionada: 0
      })
    })

    ventas.forEach((venta) => {
      const ventaRef = doc(this.firestore, `ventas/${venta.id}`);  
      if (venta.id == idInterno) {
        this.$idVentaActiva.emit(venta.idTemp);
        this.$idVentaActivaInterno.emit(venta.id);
      }
      return updateDoc(ventaRef, {
        seleccionada: venta.id === idInterno ? 1 : venta.seleccionada
      });
    })

    // this.$cambiandoDeVenta.emit(false);

    // this.obtenerVentasPorStatus("0").then(docRef => {

    //   docRef.forEach(el => {
    //     el.seleccionada = el.idTemp == id ? 1 : 0;
    //   });
    //   localStorage.setItem("ventasLS", JSON.stringify(ventasActuales));
    //   this.$ventasActuales.emit(JSON.parse(localStorage.getItem("ventasLS")));
    //   this.$idVentaActiva.emit(id)
    // });
  }

  actualizarVentasActuales(ventas: VentaInterface[]){
    this.$ventasActuales.emit(ventas)
  }

  // Actualizar el nombre de una venta en Firestore
  actualizarNombreVenta(idVenta: string, nombre: string) {
    const ventaDocRef = doc(this.firestore, `ventas/${idVenta}`);
    return updateDoc(ventaDocRef, {
      nombre: nombre
    });
  }

  eliminarVentaEnCurso(venta: VentaInterface) { // Elimina ventas desde la interfaz de venta, de las que estan en curso, todavia no completadas.
    const ventaRef = doc(this.firestore, `ventas/${venta.id}`);
    return deleteDoc(ventaRef);
  }

  finalizarVenta(venta: VentaInterface, idVenta) {

    const ventaDocRef = doc(this.firestore, `ventas/${idVenta}`);
    return updateDoc(ventaDocRef, {
      cambio: venta.cambio,
      fechaVentaIniciada: venta.fechaVentaIniciada,
      fechaVentaFinalizada: venta.fechaVentaFinalizada,
      formaDePago: venta.formaDePago,
      // idCajero: venta.idCajero,  // Se debe insertar desde que se crea la nueva venta. Aqui ya no se actualiza.
      nombreCajero: venta.nombreCajero || localStorage.getItem('nombreUsuario') || 'Desconocido', // Guardar el nombre del cajero
      idCliente: venta.idCliente,
      pagoCon: venta.pagoCon,
      seleccionada: 0, // Automaticamente se le quita el status de seleccionada.
      status: "1", // Se le cambia el status a 1 (Completada),
      total: venta.total,
      totalArticulos: venta.totalArticulos,
      totalPagadoCredito: venta.totalPagadoCredito,
      totalPagadoEfectivo: venta.totalPagadoEfectivo,
      detalleProductos: venta.detalleProductos,
      nombre: venta.nombre || '' // Incluir el nombre si existe
    });
  }

  guardarDetalleVentaProductos(productos: ProductoInterface[]) {
    productos.map(producto => {
      addDoc(this.detalleVentasCollectionRef, {cantidad: producto.cantidad, idProducto: producto.id, idVenta: producto.ventaId, precioVenta: producto.precioVenta});
    })
    // return addDoc(this.detalleVentasCollectionRef, venta);
  }

  async obtenerUltimaVentaDelDia() {
    try {
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      
      const finDia = new Date();
      finDia.setHours(23, 59, 59, 999);

      const q = query(
        this.ventasCollectionRef,
        where('status', '==', '1'),
        where('fechaVentaFinalizada', '>=', Timestamp.fromDate(hoy)),
        where('fechaVentaFinalizada', '<=', Timestamp.fromDate(finDia))
      );
      
      const ventasSnapshot = await getDocs(q);
      const ventas: VentaInterface[] = [];
      
      ventasSnapshot.forEach(doc => {
        ventas.push({
          id: doc.id,
          ...doc.data() as VentaInterface
        });
      });

      // Ordenar por fecha de finalización descendente (más reciente primero)
      ventas.sort((a, b) => {
        const fechaA = a.fechaVentaFinalizada?.toMillis() || 0;
        const fechaB = b.fechaVentaFinalizada?.toMillis() || 0;
        return fechaB - fechaA;
      });

      return ventas.length > 0 ? ventas[0] : null;
    } catch (error) {
      console.error('Error al obtener última venta del día:', error);
      return null;
    }
  }

  async cancelarVenta(idVenta: string) {
    const ventaRef = doc(this.firestore, `ventas/${idVenta}`);
    return updateDoc(ventaRef, {
      status: '2' // 2 = cancelada
    });
  }

  async actualizarVentaDespuesDevolucion(
    idVenta: string, 
    detalleProductos: any[], 
    nuevoTotal: string, 
    nuevoTotalArticulos: string
  ) {
    const ventaRef = doc(this.firestore, `ventas/${idVenta}`);
    return updateDoc(ventaRef, {
      detalleProductos: detalleProductos,
      total: nuevoTotal,
      totalArticulos: nuevoTotalArticulos
    });
  }

}

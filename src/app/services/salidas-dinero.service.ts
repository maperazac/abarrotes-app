import { Injectable } from '@angular/core';
import { addDoc, collection, deleteDoc, doc, Firestore, getDocs, orderBy, query, Timestamp, where } from '@angular/fire/firestore';
import SalidaDineroInterface from '../interfaces/salida-dinero.interface';

@Injectable({
  providedIn: 'root'
})
export class SalidasDineroService {
  salidasCollectionRef = collection(this.firestore, 'salidasDinero');

  constructor(private firestore: Firestore) { }

  // Registrar nueva salida de dinero
  registrarSalida(salida: SalidaDineroInterface) {
    return addDoc(this.salidasCollectionRef, salida);
  }

  // Obtener salidas del día actual
  async obtenerSalidasDelDia(fecha: Date) {
    const inicioDia = new Date(fecha);
    inicioDia.setHours(0, 0, 0, 0);
    
    const finDia = new Date(fecha);
    finDia.setHours(23, 59, 59, 999);

    const q = query(
      this.salidasCollectionRef,
      where('fecha', '>=', Timestamp.fromDate(inicioDia)),
      where('fecha', '<=', Timestamp.fromDate(finDia)),
      orderBy('fecha', 'desc')
    );
    
    const salidas = await getDocs(q);
    return salidas;
  }

  // Eliminar una salida
  eliminarSalida(idSalida: string) {
    const salidaRef = doc(this.firestore, `salidasDinero/${idSalida}`);
    return deleteDoc(salidaRef);
  }
}

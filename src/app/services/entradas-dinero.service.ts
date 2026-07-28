import { Injectable } from '@angular/core';
import { addDoc, collection, deleteDoc, doc, Firestore, getDocs, orderBy, query, Timestamp, where } from '@angular/fire/firestore';
import EntradaDineroInterface from '../interfaces/entrada-dinero.interface';

@Injectable({
  providedIn: 'root'
})
export class EntradasDineroService {
  entradasCollectionRef = collection(this.firestore, 'entradasDinero');

  constructor(private firestore: Firestore) { }

  // Registrar nueva entrada de dinero
  registrarEntrada(entrada: EntradaDineroInterface) {
    return addDoc(this.entradasCollectionRef, entrada);
  }

  // Obtener entradas del día actual
  async obtenerEntradasDelDia(fecha: Date) {
    const inicioDia = new Date(fecha);
    inicioDia.setHours(0, 0, 0, 0);
    
    const finDia = new Date(fecha);
    finDia.setHours(23, 59, 59, 999);

    const q = query(
      this.entradasCollectionRef,
      where('fecha', '>=', Timestamp.fromDate(inicioDia)),
      where('fecha', '<=', Timestamp.fromDate(finDia)),
      orderBy('fecha', 'desc')
    );
    
    const entradas = await getDocs(q);
    return entradas;
  }

  // Eliminar una entrada
  eliminarEntrada(idEntrada: string) {
    const entradaRef = doc(this.firestore, `entradasDinero/${idEntrada}`);
    return deleteDoc(entradaRef);
  }
}

import { Injectable } from '@angular/core';
import { Firestore, collection, addDoc, query, where, getDocs, doc, getDoc, updateDoc, deleteDoc, orderBy, Timestamp } from '@angular/fire/firestore';
import ClienteInterface, { VentaCreditoInterface, AbonoInterface } from '../interfaces/cliente.interface';

@Injectable({
  providedIn: 'root'
})
export class ClientesService {
  private clientesCollectionRef = collection(this.firestore, 'clientes');
  private ventasCreditoCollectionRef = collection(this.firestore, 'ventasCredito');
  private abonosCollectionRef = collection(this.firestore, 'abonos');

  constructor(private firestore: Firestore) { }

  /**
   * Crear un nuevo cliente
   */
  crearCliente(cliente: ClienteInterface) {
    return addDoc(this.clientesCollectionRef, cliente);
  }

  /**
   * Obtener todos los clientes ordenados por nombre
   */
  async obtenerClientes() {
    const q = query(this.clientesCollectionRef, orderBy('nombre'));
    const snapshot = await getDocs(q);
    return snapshot;
  }

  /**
   * Buscar clientes por nombre o número
   */
  async buscarClientes(busqueda: string) {
    const busquedaLower = busqueda.toLowerCase();
    const todosClientes = await this.obtenerClientes();
    
    const clientes: ClienteInterface[] = [];
    todosClientes.forEach(doc => {
      const cliente = { id: doc.id, ...(doc.data() as any) } as ClienteInterface;
      const nombreLower = (cliente.nombre || '').toLowerCase();
      const numeroLower = (cliente.numero || '').toLowerCase();
      
      if (nombreLower.includes(busquedaLower) || numeroLower.includes(busquedaLower)) {
        clientes.push(cliente);
      }
    });
    
    return clientes;
  }

  /**
   * Obtener un cliente por ID
   */
  async obtenerClientePorId(id: string): Promise<ClienteInterface | null> {
    const docRef = doc(this.firestore, 'clientes', id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as ClienteInterface;
    }
    return null;
  }

  /**
   * Actualizar información del cliente
   */
  modificarCliente(cliente: ClienteInterface, id: string) {
    const clienteDocRef = doc(this.firestore, `clientes/${id}`);
    return updateDoc(clienteDocRef, {
      nombre: cliente.nombre,
      direccion: cliente.direccion,
      telefono: cliente.telefono,
      limiteCredito: cliente.limiteCredito,
      saldoActual: cliente.saldoActual,
      activo: cliente.activo,
      notas: cliente.notas
    });
  }

  /**
   * Eliminar cliente
   */
  eliminarCliente(id: string) {
    const clienteDocRef = doc(this.firestore, `clientes/${id}`);
    return deleteDoc(clienteDocRef);
  }

  /**
   * Actualizar solo el saldo del cliente
   */
  async actualizarSaldoCliente(idCliente: string, nuevoSaldo: number) {
    const clienteDocRef = doc(this.firestore, `clientes/${idCliente}`);
    return updateDoc(clienteDocRef, {
      saldoActual: nuevoSaldo
    });
  }

  // ==================== VENTAS A CRÉDITO ====================

  /**
   * Obtener ventas a crédito de un cliente
   */
  async obtenerVentasCreditoCliente(idCliente: string, soloNoLiquidadas: boolean = false) {
    let q;
    if (soloNoLiquidadas) {
      q = query(
        this.ventasCreditoCollectionRef,
        where('idCliente', '==', idCliente),
        where('liquidada', '==', false),
        orderBy('fechaVenta', 'desc')
      );
    } else {
      q = query(
        this.ventasCreditoCollectionRef,
        where('idCliente', '==', idCliente),
        orderBy('fechaVenta', 'desc')
      );
    }
    
    const snapshot = await getDocs(q);
    const ventas: VentaCreditoInterface[] = [];
    snapshot.forEach(doc => {
      ventas.push({ id: doc.id, ...(doc.data() as any) } as VentaCreditoInterface);
    });
    
    return ventas;
  }

  /**
   * Registrar una venta a crédito
   */
  registrarVentaCredito(ventaCredito: VentaCreditoInterface) {
    return addDoc(this.ventasCreditoCollectionRef, ventaCredito);
  }

  /**
   * Actualizar saldo pendiente de una venta a crédito
   */
  async actualizarSaldoVentaCredito(idVentaCredito: string, nuevoSaldo: number) {
    const ventaCreditoDocRef = doc(this.firestore, `ventasCredito/${idVentaCredito}`);
    const liquidada = nuevoSaldo <= 0;
    
    return updateDoc(ventaCreditoDocRef, {
      saldoPendiente: nuevoSaldo,
      liquidada: liquidada
    });
  }

  // ==================== ABONOS ====================

  /**
   * Registrar un abono
   */
  registrarAbono(abono: AbonoInterface) {
    return addDoc(this.abonosCollectionRef, abono);
  }

  /**
   * Obtener abonos de una venta a crédito
   */
  async obtenerAbonosVentaCredito(idVentaCredito: string) {
    const q = query(
      this.abonosCollectionRef,
      where('idVentaCredito', '==', idVentaCredito),
      orderBy('fecha', 'desc')
    );
    
    const snapshot = await getDocs(q);
    const abonos: AbonoInterface[] = [];
    snapshot.forEach(doc => {
      abonos.push({ id: doc.id, ...(doc.data() as any) } as AbonoInterface);
    });
    
    return abonos;
  }

  /**
   * Obtener todos los abonos de un cliente
   */
  async obtenerAbonosCliente(idCliente: string) {
    const q = query(
      this.abonosCollectionRef,
      where('idCliente', '==', idCliente),
      orderBy('fecha', 'desc')
    );
    
    const snapshot = await getDocs(q);
    const abonos: AbonoInterface[] = [];
    snapshot.forEach(doc => {
      abonos.push({ id: doc.id, ...(doc.data() as any) } as AbonoInterface);
    });
    
    return abonos;
  }
}

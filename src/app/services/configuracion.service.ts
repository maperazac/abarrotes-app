import { Injectable } from '@angular/core';
import { Firestore, collection, doc, getDoc, setDoc, getDocs } from '@angular/fire/firestore';
import { BehaviorSubject, Observable } from 'rxjs';

export interface OpcionesHabilitadas {
  usarInventarios: boolean;
  creditoClientes: boolean;
  productoComun: boolean;
  calcularPrecioAutomatico: boolean;
  margenGanancia: number;
  redondearCentavos: boolean;
  redondeoDecimales: string;
}

@Injectable({
  providedIn: 'root'
})
export class ConfiguracionService {
  private configCollectionRef = collection(this.firestore, 'configuracion');
  private readonly CONFIG_DOC_ID = 'opciones-habilitadas'; // ID fijo para el documento

  // BehaviorSubject para notificar cambios de configuración
  private configuracionCambiadaSubject = new BehaviorSubject<OpcionesHabilitadas | null>(null);
  public configuracionCambiada$: Observable<OpcionesHabilitadas | null> = this.configuracionCambiadaSubject.asObservable();

  constructor(private firestore: Firestore) { }

  /**
   * Guardar opciones habilitadas en Firestore
   */
  async guardarOpcionesHabilitadas(opciones: OpcionesHabilitadas): Promise<void> {
    const docRef = doc(this.configCollectionRef, this.CONFIG_DOC_ID);
    await setDoc(docRef, opciones);
    // Notificar a todos los suscriptores que la configuración ha cambiado
    this.configuracionCambiadaSubject.next(opciones);
  }

  /**
   * Obtener opciones habilitadas desde Firestore
   */
  async obtenerOpcionesHabilitadas(): Promise<OpcionesHabilitadas | null> {
    const docRef = doc(this.configCollectionRef, this.CONFIG_DOC_ID);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data() as OpcionesHabilitadas;
    } else {
      // Retornar configuración por defecto si no existe
      return this.getConfiguracionPorDefecto();
    }
  }

  /**
   * Obtener configuración por defecto
   */
  private getConfiguracionPorDefecto(): OpcionesHabilitadas {
    return {
      usarInventarios: true,
      creditoClientes: true,
      productoComun: true,
      calcularPrecioAutomatico: true,
      margenGanancia: 20,
      redondearCentavos: false,
      redondeoDecimales: 'A décimas (Ej: 45.52 -> 45.60, 35.18 -> 35.20)'
    };
  }

  /**
   * Verificar si existe configuración guardada
   */
  async existeConfiguracion(): Promise<boolean> {
    const docRef = doc(this.configCollectionRef, this.CONFIG_DOC_ID);
    const docSnap = await getDoc(docRef);
    return docSnap.exists();
  }
}

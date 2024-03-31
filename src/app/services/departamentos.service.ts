import { Injectable } from '@angular/core';
import { Firestore, collection, addDoc, query, orderBy, getDocs, where, doc, getDoc } from '@angular/fire/firestore';
import DepartamentoInterface from '../interfaces/deparamentos.interface';

@Injectable({
  providedIn: 'root'
})
export class DepartamentosService {
  departamentosCollectionRef = collection(this.firestore, 'departamentos');
  constructor(private firestore: Firestore) { }

  crearDepartamento(departamento: DepartamentoInterface) {
    return addDoc(this.departamentosCollectionRef, departamento);
  }

  async obtenerDepartamentos() {
    const q = query(this.departamentosCollectionRef, orderBy('nombre'))
    const dep = await getDocs(q)
    return dep;
  }

  async obtenerDepartamentosPorId(id: string)  {
    // const q = await query(this.departamentosCollectionRef, where('id', "==", id))
    // const departamento = await getDocs(q)
    // return departamento;


    const docRef = doc(this.firestore, 'departamentos', id);
    return await getDoc(docRef);
  }
}

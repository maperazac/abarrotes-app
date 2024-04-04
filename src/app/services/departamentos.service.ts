import { Injectable } from '@angular/core';
import { Firestore, collection, addDoc, query, orderBy, getDocs, where, doc, getDoc, deleteDoc, updateDoc } from '@angular/fire/firestore';
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
    const docRef = doc(this.firestore, 'departamentos', id);
    return await getDoc(docRef);
  }

  async obtenerDepartamentosPorNombre(nombre: string) {
    const q = await query(this.departamentosCollectionRef, where('nombre', "==", nombre))
    const departamento = await getDocs(q)
    return departamento;
  }

  borrarDepartamento(id: string) {
    const departamentoDocRef = doc(this.firestore, `departamentos/${id}`);
    return deleteDoc(departamentoDocRef);
  }
  
  modificarDepartamento(departamento: DepartamentoInterface, id) {
    const departamentoDocRef = doc(this.firestore, `departamentos/${id}`);
    return updateDoc(departamentoDocRef, {
      nombre: departamento.nombre
    });
  }

  // modificarDepartamento(id: string) {
  //   const q = query(this.departamentosCollectionRef, where("departamento", "==", id));
  //   const querySnapshot = await getDocs(q);
  // }

}

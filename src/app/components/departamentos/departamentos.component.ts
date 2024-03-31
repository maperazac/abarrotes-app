import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import DepartamentoInterface from 'src/app/interfaces/deparamentos.interface';
import { DepartamentosService } from 'src/app/services/departamentos.service';

@Component({
  selector: 'app-departamentos',
  templateUrl: './departamentos.component.html',
  styleUrls: ['./departamentos.component.scss']
})
export class DepartamentosComponent implements OnInit {
  @ViewChild('nombreDepartamento', { static: true }) input: ElementRef;

  constructor(private departamentosService: DepartamentosService) { }

  departamentos: DepartamentoInterface[] = [];
  departamentosTemp = this.departamentos;

  ngOnInit(): void {
    this.obtenerDepartamentos();
  }

  obtenerDepartamentos () {
    this.departamentosService.obtenerDepartamentos().then(docRef => {
      const departamentos: any[] = [];

      docRef.forEach ( producto => {
        departamentos.push({
          id: producto.id,
          ...producto.data()
        })
      })

      this.departamentos = departamentos;
      this.departamentosTemp = departamentos;
      this.input.nativeElement.focus();

      // this.filtrarProductosDeLaBusqueda(event);
      // this.ProductoSeleccionado = <ProductoInterface>{}
      // this.activarBotonAceptar = false;
      // const inputPalabraClave= this.el.nativeElement.querySelector("#palabraClave");
      // inputPalabraClave.value='';
      // inputPalabraClave.focus();
    })
  }

  async agregarNuevoDepartamento(nombre: string) {
    // console.log(nombre)
    if (nombre != '') {
      let nuevoDepartamento = {
        'nombre': nombre
      }
      
      await this.departamentosService.crearDepartamento(nuevoDepartamento).then (docRef => {
        // console.log(docRef.id)
        this.departamentosService.obtenerDepartamentosPorId(docRef.id).then (doc => {
          if(doc.data()['nombre'] != '') {
            
            this.departamentos.push({
              id: docRef.id,
              nombre: doc.data()['nombre']
            })

            this.departamentosTemp = this.departamentos;
          }
        })
        this.input.nativeElement.value = '';
      })
      .catch(e => console.log('Error: ', e));
    }
  }

  filtrarDepartamentos(event: any) {
    if (event) {
      if (event.target.value.length >= 2) {
        this.departamentosTemp = this.departamentos.filter((obj) => {
          return obj.nombre.toLowerCase().includes(event.target.value.toLowerCase())
        })
      } else {
        this.departamentosTemp = this.departamentos;
      }
    } else {
      this.departamentosTemp = this.departamentos;
    }
  }

}

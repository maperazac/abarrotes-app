import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import DepartamentoInterface from 'src/app/interfaces/deparamentos.interface';
import { DepartamentosService } from 'src/app/services/departamentos.service';
import Swal from 'sweetalert2';
import { ProductosService } from '../../services/productos.service';

@Component({
  selector: 'app-departamentos',
  templateUrl: './departamentos.component.html',
  styleUrls: ['./departamentos.component.scss']
})
export class DepartamentosComponent implements OnInit {
  @ViewChild('nombreDepartamento', { static: true }) input: ElementRef;

  constructor(private departamentosService: DepartamentosService, private productosService: ProductosService) { }

  departamentos: DepartamentoInterface[] = [];
  departamentosTemp = this.departamentos;
  departamentoAActualizar = '';
  estaActualizando = false;
  idActualizar;

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
          return obj.nombre.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').includes(event.target.value.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, ''))
        })
      } else {
        this.departamentosTemp = this.departamentos;
      }
    } else {
      this.departamentosTemp = this.departamentos;
    }
  }

  modalEliminarDepartamento(departamento: DepartamentoInterface) {
    const swalWithBootstrapButtons = Swal.mixin({
      customClass: {
        confirmButton: "btn btn-secondary w-100",
        cancelButton: "btn btn-primary w-100 mb-3"
      },
      buttonsStyling: false
    });
    swalWithBootstrapButtons.fire({
      title: "¿Deseas eliminar '"+ departamento.nombre +"'?",
      text: "Todos los productos asociados a este departamento quedarán sin departamento",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí",
      cancelButtonText: "No",
      reverseButtons: true
    }).then((result) => {
      if (result.isConfirmed) {
        this.departamentosService.borrarDepartamento(departamento.id);
        this.productosService.actualizarDepartamentoEnProductos(departamento.id);
        this.obtenerDepartamentos();
        swalWithBootstrapButtons.fire({
          title: "Eliminado",
          text: "Se ha eliminado el departamento",
          icon: "success"
        });
      } else 
      {
        // this.productosService.actualizarDepartamentoEnProductos(id);

        // Swal.fire({
        //   html: "ok"
        // })
      }
    });
  }

  editarDepartamento(departamento: DepartamentoInterface) {
    this.estaActualizando = true;
    this.departamentoAActualizar = departamento.nombre;
    this.idActualizar = departamento.id;
    setTimeout(() => {
      document.getElementById("inputDepartamentoAActualizar").focus();
    }, 100);
  }

  guardarEditado() {
    if (this.departamentoAActualizar != '') {
      let departamento = {
        nombre: this.departamentoAActualizar
      }
      this.departamentosService.modificarDepartamento(departamento, this.idActualizar)
      this.obtenerDepartamentos();
      this.cerrarEditar();
      Swal.fire({
        position: "center",
        icon: "success",
        title: "Se ha modificado exitosamente.",
        showConfirmButton: false,
        timer: 1500
      });
    }
  }

  cerrarEditar() {
    this.estaActualizando = false;
    this.departamentoAActualizar = '';
  }

}

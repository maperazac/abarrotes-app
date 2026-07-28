import { Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { FormControl, FormGroup, NgForm, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable } from 'rxjs';
import DepartamentoInterface from 'src/app/interfaces/deparamentos.interface';
import ProductoInterface from 'src/app/interfaces/productos.interface';
import { BuscarProductoModel } from 'src/app/models/buscarProducto.model';
import { ProductoModel } from 'src/app/models/producto.model';
import { DepartamentosService } from 'src/app/services/departamentos.service';
import { ProductosService } from 'src/app/services/productos.service';
import { ConfiguracionService } from 'src/app/services/configuracion.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-nuevo-producto',
  templateUrl: './nuevo-producto.component.html',
  styleUrls: ['./nuevo-producto.component.scss']
})
export class NuevoProductoComponent implements OnInit {
  @ViewChild('nuevoDepartamento') nuevoDepartamento: ElementRef;

  @Input() esModificacion:boolean;
  @Output()
  botonSeleccionado = new EventEmitter<number>();
  buscarProducto = new BuscarProductoModel();
  formulario: FormGroup;
  id: number;
  private sub: any;
  deptos: DepartamentoInterface[] = [];
  nombreNuevoDepartamento: string;
  formularioInvalido = false;
  codigoOriginal: string = ''; // Para guardar el código original al modificar
  calculoAutomaticoHabilitado: boolean = false; // Para controlar el comportamiento de ganancia

  constructor( private productosService: ProductosService, 
               private el: ElementRef,
               private route: ActivatedRoute,
               private router: Router,
               private departamentosService: DepartamentosService,
               private configuracionService: ConfiguracionService) {
    this.formulario = new FormGroup({
      id: new FormControl(),
      codigoDeBarras: new FormControl(),
      descripcion: new FormControl(),
      seVende: new FormControl(),
      precioCosto:new FormControl(),
      ganancia: new FormControl(),
      precioVenta: new FormControl(),
      precioMayoreo: new FormControl(),
      departamento: new FormControl()
    })
   }

  ngOnInit() {    
    this.sub = this.route.params.subscribe(params => {
      // debugger;
      const codigoBarras = params['id']; // Obtener el código de barras (puede ser número o string)

      // Si existe un código de barras en los parámetros, es una modificación
      if(codigoBarras) {
        this.esModificacion = true;
        
        // Usar el código tal cual viene (string o número)
        this.buscarProducto.palabraClave = codigoBarras;

        this.buscarProductoPorCodigoDeBaras();
        
        // También cargar configuración para mantener comportamiento consistente
        this.cargarEstadoConfiguracion();

        setTimeout(() => {
          this.botonSeleccionado.emit(2)
        }, 100);
      } else {
        // Si es un nuevo producto, cargar ganancia por defecto de configuración
        this.cargarGananciaPorDefecto();
        // setTimeout(() => {
        //   this.botonSeleccionado.emit(1)
        // }, 100);
      }
   });

   this.obtenerDepartamentos();
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }

  ngAfterViewInit() {
    if(this.esModificacion) {
      const inputPalabraClave= this.el.nativeElement.querySelector("#codigoDeProducto");
      inputPalabraClave.focus();
    } else {
      const inputPalabraClave= this.el.nativeElement.querySelector("#codigoDeBarras");
      inputPalabraClave.focus();
    }
  }

  async guardar() {

    this.formularioInvalido = false;

    if(this.formulario.invalid || this.formulario.controls['seVende'].value == null || this.formulario.controls['departamento'].value == null) {
      this.formularioInvalido = true;
      return;
    }

    if(this.formulario.controls['departamento'].value == -1) { //Si el departamento es -1 entonces es uno nuevo, aqui llamar servicio para ver si ya existe uno con ese nombre
      let inputNuevoDepartamento = (<HTMLInputElement>document.getElementById("nuevoDepartamento")).value;
      let deptosCount = 0;
      let deptoId;

      this.deptos.forEach(d => {
        if(d.nombre.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '') == inputNuevoDepartamento.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')) {
          deptosCount += 1;
          deptoId = d.id;
        }
      })

      if(deptosCount == 0) { // Significa que el nuevo departamento no existe, se agrega como nuevo.
        let nuevoDepartamento = {
          nombre: inputNuevoDepartamento
        }
        console.log(nuevoDepartamento)
        await this.departamentosService.crearDepartamento(nuevoDepartamento).then(doc => {
          console.log(doc.id)
          this.obtenerDepartamentos();
          this.formulario.patchValue({departamento: doc.id});
        })
        document.getElementById("nuevoDepartamento").hidden = true;
        (<HTMLInputElement>document.getElementById("nuevoDepartamento")).value = '';
      } else { // Significa que es un departamento que ya existe, repetido. Se asigna el id al dropdown de departamentos.
        this.formulario.patchValue({departamento: deptoId});
        document.getElementById("nuevoDepartamento").hidden = true;
        (<HTMLInputElement>document.getElementById("nuevoDepartamento")).value = '';
      }
    }

    // Si no tiene código de barras, generar uno automático
    if (!this.formulario.controls['codigoDeBarras'].value || this.formulario.controls['codigoDeBarras'].value.trim() === '') {
      const codigoGenerado = 'SIN-CB-' + Date.now();
      this.formulario.patchValue({codigoDeBarras: codigoGenerado});
    }

    Swal.fire({
      title: 'Espere',
      text: 'Guardando producto',
      icon: 'info',
      allowOutsideClick: false
    });
    Swal.showLoading();

    let esRepetido = false;
    const codigoDeBarras = this.formulario.controls['codigoDeBarras'].value;

    // Validar duplicados:
    // - En modo creación: siempre validar excepto si es código generado
    // - En modo modificación: validar solo si el código cambió y no es generado
    const codigoCambio = this.esModificacion && codigoDeBarras !== this.codigoOriginal;
    const debeValidar = (!this.esModificacion || codigoCambio) && !codigoDeBarras.startsWith('SIN-CB-');
    
    if (debeValidar) {
      await this.validarProductoRepetido(codigoDeBarras).then(resp => {
        esRepetido = resp;
      });
    }

    if(!this.esModificacion) {
      if(esRepetido) {
        if (esRepetido) {
          Swal.fire({
            title: 'Código repetido',
            text: 'Ya existe un producto registrado con este código de barras. Por favor verifique.',
            icon: 'warning',
            didClose: () => {
              const codigoDeBarras= this.el.nativeElement.querySelector("#codigoDeBarras");
              codigoDeBarras.focus();
            }
          })
          
         }
      } else {
        // Crear objeto sin el campo 'id' para nuevos productos
        const { id, ...productoData } = this.formulario.value;
        
        await this.productosService.crearProducto(productoData).then( docRef => {
          console.log(docRef)
          Swal.fire({
            title: this.formulario.controls['descripcion'].value,
            text: 'Se agregó correctamente',
            icon: 'success',
            timer: 1500,
            didClose: () => {
              this.formulario.reset();     
              const codigoDeBarras= this.el.nativeElement.querySelector("#codigoDeBarras");
              codigoDeBarras.focus();
            }
          })
      
             
        })
        .catch(e => console.log('Error: ', e));
      }
    }

    if(this.esModificacion) {
      if(esRepetido) {
        Swal.fire({
          title: 'Código repetido',
          text: 'Ya existe un producto registrado con este código de barras. Por favor verifique.',
          icon: 'warning',
          didClose: () => {
            const codigoDeBarras= this.el.nativeElement.querySelector("#codigoDeBarras");
            codigoDeBarras.focus();
          }
        })
      } else {
        const productoId = this.formulario.controls['id'].value;
        await this.productosService.modificarProducto(this.formulario.value, productoId).then( () => {
          Swal.fire({
            title: this.formulario.controls['descripcion'].value,
            text: 'Se actualizó correctamente',
            icon: 'success'
          })
        })
        .catch(e => console.log('Error: ', e));
      }
    }
  }

  async validarProductoRepetido(codigo: string) {
    let esRepetido = false;
    await this.productosService.obtenerProductoPorCodigoDeBarras(codigo).then(docRef => {  
      const productos: any[] = [];
 
       docRef.forEach ( producto => {
         productos.push({
           id: producto.id,
           ...producto.data()
         })
       })
 
       esRepetido = productos.length != 0 ? true : false; 
     })
     .catch( e => console.log('error: ', e))

     return esRepetido;
  }

  setSeVende (tipo: number) {
    this.formulario.patchValue({seVende: tipo});
  }

  setDepartamento(departamento: string) {
    this.formulario.patchValue({departamento: departamento});
    if(departamento != '-1') {
      document.getElementById("nuevoDepartamento").hidden = true;
    } else {
      document.getElementById("nuevoDepartamento").hidden = false;
      document.getElementById("nuevoDepartamento").focus();
    }
  }

  validarCosto(event: any) {
    if(event.target.value== '') {
      this.formulario.patchValue({precioMayoreo: 0});
      this.formulario.patchValue({precioVenta: 0});
      
      // Solo resetear ganancia si NO está habilitado el cálculo automático
      if (!this.calculoAutomaticoHabilitado) {
        this.formulario.patchValue({ganancia: 0});
      }
      return;
    }

    // Si hay un porcentaje de ganancia, calcular automáticamente los precios
    const ganancia = this.formulario.controls['ganancia'].value;
    if (ganancia && ganancia > 0) {
      const precioCosto = parseFloat(event.target.value);
      const nuevoPrecio = Math.ceil(precioCosto * (1 + (ganancia / 100)));
      
      this.formulario.patchValue({precioMayoreo: nuevoPrecio});
      this.formulario.patchValue({precioVenta: nuevoPrecio});
    }
  }

  calcularPrecioVenta(event: any) {
    if (!this.formulario.controls['precioCosto'].value) {
      this.formulario.patchValue({precioMayoreo: 0});
      this.formulario.patchValue({precioVenta: 0});
      // No resetear ganancia aquí, se está escribiendo en el campo de ganancia
      return;
    } 

    const nuevoPrecio = this.formulario.controls['precioCosto'].value * (1 + ( event.target.value / 100)) < 0 ? 0 : Math.ceil(this.formulario.controls['precioCosto'].value * (1 + ( event.target.value / 100)));
    
    this.formulario.patchValue({precioMayoreo: nuevoPrecio});
    this.formulario.patchValue({precioVenta: nuevoPrecio});
  }

  calcularGanancia(event: any) {
    if (!this.formulario.controls['precioCosto'].value) {
      this.formulario.patchValue({precioMayoreo: 0});
      this.formulario.patchValue({precioVenta: 0});
      
      // Solo resetear ganancia si NO está habilitado el cálculo automático
      if (!this.calculoAutomaticoHabilitado) {
        this.formulario.patchValue({ganancia: 0});
      }
      return;
    } 

    const nuevaGanancia = Math.round(((event.target.value * 100) / this.formulario.controls['precioCosto'].value) - 100) < 0 ? 0 : Math.round(((event.target.value * 100) / this.formulario.controls['precioCosto'].value) - 100);

    this.formulario.patchValue({ganancia: nuevaGanancia});
  }

  async buscarProductoPorCodigoDeBaras() {
    Swal.fire({
      title: 'Buscando producto',
      text: 'Espere...',
      icon: 'info',
      allowOutsideClick: false
    });
    Swal.showLoading();

    await this.productosService.obtenerProductoPorCodigoDeBarras(this.buscarProducto.palabraClave).then(docRef => {  
     const productos: any[] = [];

      docRef.forEach ( producto => {
        productos.push({
          id: producto.id,
          ...producto.data()
        })
      })

      if (productos.length == 0) {
        this.formulario.reset();
        Swal.fire({
          title: 'Producto no encontrado',
          text: 'No existe ningún producto con este código de barras.',
          icon: 'warning'
        })
      } else {
        this.formulario.setValue({
          id: productos[0].id,
          codigoDeBarras: productos[0].codigoDeBarras,
          descripcion: productos[0].descripcion,
          seVende: productos[0].seVende,
          precioCosto: productos[0].precioCosto,
          ganancia: productos[0].ganancia,
          precioVenta: productos[0].precioVenta,
          precioMayoreo: productos[0].precioMayoreo,
          departamento: productos[0].departamento
        })
        // Guardar el código original para validación de duplicados
        this.codigoOriginal = productos[0].codigoDeBarras;
        Swal.close();
      }
    })
    .catch( e => console.log('error: ', e))
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

      this.deptos=departamentos;
    })
  }

  async cargarGananciaPorDefecto(): Promise<void> {
    try {
      // Cargar configuración desde Firestore
      const config = await this.configuracionService.obtenerOpcionesHabilitadas();
      
      if (config) {
        // Guardar el estado de cálculo automático
        this.calculoAutomaticoHabilitado = config.calcularPrecioAutomatico || false;
        
        // Si está activado el cálculo automático, pre-llenar el campo ganancia
        if (config.calcularPrecioAutomatico && config.margenGanancia) {
          this.formulario.patchValue({ ganancia: config.margenGanancia });
        }
      }
    } catch (error) {
      console.error('Error al cargar configuración de ganancia:', error);
      // No mostrar error al usuario, simplemente no pre-llenar el campo
    }
  }

  async cargarEstadoConfiguracion(): Promise<void> {
    try {
      // Cargar solo el estado de configuración sin modificar el formulario
      const config = await this.configuracionService.obtenerOpcionesHabilitadas();
      
      if (config) {
        // Guardar el estado de cálculo automático
        this.calculoAutomaticoHabilitado = config.calcularPrecioAutomatico || false;
      }
    } catch (error) {
      console.error('Error al cargar estado de configuración:', error);
    }
  }

}

import { Component, EventEmitter, HostListener, OnInit, Output } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { TeclasService } from 'src/app/services/teclas.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-producto-comun',
  templateUrl: './producto-comun.component.html',
  styleUrls: ['./producto-comun.component.scss']
})
export class ProductoComunComponent implements OnInit {
  formularioProducto: FormGroup;

  @HostListener('document:keydown', ['$event'])
  @HostListener('keydown', ['$event'])

  handleKeyboardEvent(event: KeyboardEvent) {
    // ***** TODO ESTE BLOQUE TIENE QUE IR EN LOS COMPONENTES DE TODOS LOS CUADROS DE DIALOGO *****
    // Bloquear combinaciones como Control+O
    if (event.ctrlKey || event.altKey || event.metaKey) {
      event.preventDefault();
      return;
    }    
    // Si no es una tecla permitida, prevenimos su acción predeterminada
    if (!this.teclas.esTeclaPermitida(event)) {
      event.preventDefault();
    } 
    // **********************************************************************************************
  }

  activarBotonAceptar=false;
  
  @Output() insertar: EventEmitter<any> = new EventEmitter(); // Creamos el EventEmitter

  constructor(private teclas: TeclasService,
              private fb: FormBuilder
  ) { 
    // this.formularioProducto =  new FormGroup({
    //   descripcionProductoComun: new FormControl(''),
    //   cantidadProductoComun: new FormControl(''),
    //   precioProductoComun: new FormControl('')
    // })
    this.formularioProducto = this.fb.group({
      descripcionProductoComun: ['', Validators.required],
      cantidadProductoComun: ['', Validators.required],
      precioProductoComun: ['', Validators.required]
    })
  }

  

  ngOnInit(): void {
    // Cada vez que el estado del formulario cambia, actualizamos la validez
    this.formularioProducto.valueChanges.subscribe(() => {
      this.activarBotonAceptar = this.formularioProducto.valid; // El botón se activa solo si el formulario es válido
    });
  }

  insertarProducto(){
    if (this.formularioProducto.valid) {
      // console.log('Formulario enviado:', this.formularioProducto.value);
      this.insertar.emit(this.formularioProducto.value);

      // Limpiamos el formulario después de enviarlo
      this.formularioProducto.reset();
    } else {
      console.log('Formulario inválido');
    }
  }

  onEnterKey(event: KeyboardEvent): void {
    if (event.key === 'Enter' && this.formularioProducto.valid) {
      this.insertarProducto();
    }
  }

  cerrarModalProductoComun(){
    this.activarBotonAceptar = false;
    setTimeout(() => {
      Swal.close();
    }, 50);
  }

}

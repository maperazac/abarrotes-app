import { Component, HostListener, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Timestamp } from '@angular/fire/firestore';
import { SalidasDineroService } from 'src/app/services/salidas-dinero.service';
import { TeclasService } from 'src/app/services/teclas.service';
import SalidaDineroInterface from 'src/app/interfaces/salida-dinero.interface';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-salida-dinero',
  templateUrl: './salida-dinero.component.html',
  styleUrls: ['./salida-dinero.component.scss']
})
export class SalidaDineroComponent implements OnInit {
  formularioSalida: FormGroup;
  mostrarSalidas = false;
  salidasPasadas: SalidaDineroInterface[] = [];
  salidaSeleccionada: string | null = null;
  guardando = false;
  eliminando = false;

  @HostListener('keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    // Bloquear F8 para evitar conflictos
    if (event.code === 'F8') {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    // Manejar ESC antes de validaciones
    if (event.code === 'Escape') {
      event.preventDefault();
      this.cerrarModal();
      return;
    }

    // Manejar F2 para guardar
    if (event.code === 'F2' && !this.guardando) {
      event.preventDefault();
      event.stopPropagation();
      this.guardarSalida();
      return;
    }

    // Manejar navegación con flechas
    if (event.code === 'ArrowUp' || event.code === 'ArrowDown') {
      if (this.mostrarSalidas && this.salidasPasadas.length > 0) {
        event.preventDefault();
        this.navegarSalidas(event.code);
        return;
      }
    }

    // Manejar Delete para eliminar salida
    if (event.code === 'Delete') {
      if (this.salidaSeleccionada && !this.eliminando) {
        event.preventDefault();
        this.confirmarEliminarSalida();
        return;
      }
    }

    // Bloquear combinaciones no permitidas
    if (event.ctrlKey || event.altKey || event.metaKey) {
      event.preventDefault();
      return;
    }
    
    // Validar otras teclas
    if (!this.teclas.esTeclaPermitida(event)) {
      event.preventDefault();
    }
  }

  constructor(
    private salidasService: SalidasDineroService,
    private teclas: TeclasService
  ) {
    this.formularioSalida = new FormGroup({
      cantidad: new FormControl('', [Validators.required, Validators.min(0.01)]),
      detalle: new FormControl('', [Validators.required, Validators.maxLength(200)])
    });
  }

  ngOnInit(): void {
    this.cargarSalidasDelDia();
    // Limpiar el formulario al iniciar
    this.limpiarFormulario();
  }

  async cargarSalidasDelDia() {
    try {
      const hoy = new Date();
      const resultado = await this.salidasService.obtenerSalidasDelDia(hoy);
      this.salidasPasadas = [];
      resultado.forEach(doc => {
        this.salidasPasadas.push({
          id: doc.id,
          ...doc.data() as SalidaDineroInterface
        });
      });
    } catch (error) {
      console.error('Error al cargar salidas:', error);
    }
  }

  toggleMostrarSalidas() {
    this.mostrarSalidas = !this.mostrarSalidas;
    if (this.mostrarSalidas) {
      this.cargarSalidasDelDia();
    }
  }

  seleccionarSalida(id: string) {
    this.salidaSeleccionada = id;
  }

  navegarSalidas(direccion: string) {
    if (this.salidasPasadas.length === 0) return;

    const currentIndex = this.salidasPasadas.findIndex(e => e.id === this.salidaSeleccionada);
    let newIndex: number;

    if (direccion === 'ArrowDown') {
      newIndex = currentIndex < this.salidasPasadas.length - 1 ? currentIndex + 1 : 0;
    } else {
      newIndex = currentIndex > 0 ? currentIndex - 1 : this.salidasPasadas.length - 1;
    }

    this.salidaSeleccionada = this.salidasPasadas[newIndex].id || null;
  }

  async guardarSalida() {
    if (this.formularioSalida.invalid || this.guardando) {
      Swal.fire({
        icon: 'warning',
        title: 'Campos incompletos',
        text: 'Por favor completa todos los campos correctamente'
      });
      return;
    }

    this.guardando = true;
    try {
      const salida: SalidaDineroInterface = {
        fecha: Timestamp.fromDate(new Date()),
        cantidad: parseFloat(this.formularioSalida.get('cantidad')?.value),
        detalle: this.formularioSalida.get('detalle')?.value.trim(),
        idCajero: '0' // TODO: obtener del usuario logueado
      };

      await this.salidasService.registrarSalida(salida);
      
      Swal.fire({
        icon: 'success',
        title: 'Salida registrada',
        text: `Se registró la salida de $${salida.cantidad.toFixed(2)}`,
        timer: 1500,
        showConfirmButton: false
      });

      this.limpiarFormulario();
      this.cargarSalidasDelDia();
      
      // Volver a poner el foco en el campo cantidad
      setTimeout(() => {
        const cantidadInput = document.querySelector('#cantidadSalida') as HTMLInputElement;
        if (cantidadInput) cantidadInput.focus();
      }, 100);
    } catch (error) {
      console.error('Error al guardar salida:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo registrar la salida'
      });
    } finally {
      this.guardando = false;
    }
  }

  async confirmarEliminarSalida() {
    if (!this.salidaSeleccionada) return;

    const salida = this.salidasPasadas.find(e => e.id === this.salidaSeleccionada);
    if (!salida) return;

    const result = await Swal.fire({
      title: '¿Cancelar esta salida?',
      html: `<p>Cantidad: <strong>$${salida.cantidad.toFixed(2)}</strong></p><p>Detalle: ${salida.detalle}</p>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, cancelar salida',
      cancelButtonText: 'No'
    });

    if (result.isConfirmed) {
      await this.eliminarSalida();
    }
  }

  async eliminarSalida() {
    if (!this.salidaSeleccionada) return;

    this.eliminando = true;
    try {
      await this.salidasService.eliminarSalida(this.salidaSeleccionada);
      
      Swal.fire({
        icon: 'success',
        title: 'Salida cancelada',
        timer: 1500,
        showConfirmButton: false
      });

      this.salidaSeleccionada = null;
      this.cargarSalidasDelDia();
    } catch (error) {
      console.error('Error al eliminar salida:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo cancelar la salida'
      });
    } finally {
      this.eliminando = false;
    }
  }

  cerrarModal() {
    this.limpiarFormulario();
    this.salidaSeleccionada = null;
    this.mostrarSalidas = false;
    Swal.close();
  }

  limpiarFormulario() {
    this.formularioSalida.reset();
    this.formularioSalida.markAsPristine();
    this.formularioSalida.markAsUntouched();
    this.formularioSalida.patchValue({
      cantidad: '',
      detalle: ''
    });
  }
}

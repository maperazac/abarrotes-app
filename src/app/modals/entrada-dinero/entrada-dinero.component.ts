import { Component, HostListener, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Timestamp } from '@angular/fire/firestore';
import { EntradasDineroService } from 'src/app/services/entradas-dinero.service';
import { TeclasService } from 'src/app/services/teclas.service';
import EntradaDineroInterface from 'src/app/interfaces/entrada-dinero.interface';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-entrada-dinero',
  templateUrl: './entrada-dinero.component.html',
  styleUrls: ['./entrada-dinero.component.scss']
})
export class EntradaDineroComponent implements OnInit {
  formularioEntrada: FormGroup;
  mostrarEntradas = false;
  entradasPasadas: EntradaDineroInterface[] = [];
  entradaSeleccionada: string | null = null;
  guardando = false;
  eliminando = false;

  @HostListener('keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    // Bloquear F7 para evitar conflictos
    if (event.code === 'F7') {
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
      this.guardarEntrada();
      return;
    }

    // Manejar navegación con flechas
    if (event.code === 'ArrowUp' || event.code === 'ArrowDown') {
      if (this.mostrarEntradas && this.entradasPasadas.length > 0) {
        event.preventDefault();
        this.navegarEntradas(event.code);
        return;
      }
    }

    // Manejar Delete para eliminar entrada
    if (event.code === 'Delete') {
      if (this.entradaSeleccionada && !this.eliminando) {
        event.preventDefault();
        this.confirmarEliminarEntrada();
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
    private entradasService: EntradasDineroService,
    private teclas: TeclasService
  ) {
    this.formularioEntrada = new FormGroup({
      cantidad: new FormControl('', [Validators.required, Validators.min(0.01)]),
      detalle: new FormControl('', [Validators.required, Validators.maxLength(200)])
    });
  }

  ngOnInit(): void {
    this.cargarEntradasDelDia();
    // Limpiar el formulario al iniciar
    this.limpiarFormulario();
  }

  async cargarEntradasDelDia() {
    try {
      const hoy = new Date();
      const resultado = await this.entradasService.obtenerEntradasDelDia(hoy);
      this.entradasPasadas = [];
      resultado.forEach(doc => {
        this.entradasPasadas.push({
          id: doc.id,
          ...doc.data() as EntradaDineroInterface
        });
      });
    } catch (error) {
      console.error('Error al cargar entradas:', error);
    }
  }

  toggleMostrarEntradas() {
    this.mostrarEntradas = !this.mostrarEntradas;
    if (this.mostrarEntradas) {
      this.cargarEntradasDelDia();
    }
  }

  seleccionarEntrada(id: string) {
    this.entradaSeleccionada = id;
  }

  navegarEntradas(direccion: string) {
    if (this.entradasPasadas.length === 0) return;

    const currentIndex = this.entradasPasadas.findIndex(e => e.id === this.entradaSeleccionada);
    let newIndex: number;

    if (direccion === 'ArrowDown') {
      newIndex = currentIndex < this.entradasPasadas.length - 1 ? currentIndex + 1 : 0;
    } else {
      newIndex = currentIndex > 0 ? currentIndex - 1 : this.entradasPasadas.length - 1;
    }

    this.entradaSeleccionada = this.entradasPasadas[newIndex].id || null;
  }

  async guardarEntrada() {
    if (this.formularioEntrada.invalid || this.guardando) {
      Swal.fire({
        icon: 'warning',
        title: 'Campos incompletos',
        text: 'Por favor completa todos los campos correctamente'
      });
      return;
    }

    this.guardando = true;
    try {
      const entrada: EntradaDineroInterface = {
        fecha: Timestamp.fromDate(new Date()),
        cantidad: parseFloat(this.formularioEntrada.get('cantidad')?.value),
        detalle: this.formularioEntrada.get('detalle')?.value.trim(),
        idCajero: localStorage.getItem('userId') || '0'
      };

      await this.entradasService.registrarEntrada(entrada);
      
      Swal.fire({
        icon: 'success',
        title: 'Entrada registrada',
        text: `Se registró la entrada de $${entrada.cantidad.toFixed(2)}`,
        timer: 1500,
        showConfirmButton: false
      });

      this.limpiarFormulario();
      this.cargarEntradasDelDia();
      
      // Volver a poner el foco en el campo cantidad
      setTimeout(() => {
        const cantidadInput = document.querySelector('#cantidad') as HTMLInputElement;
        if (cantidadInput) cantidadInput.focus();
      }, 100);
    } catch (error) {
      console.error('Error al guardar entrada:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo registrar la entrada'
      });
    } finally {
      this.guardando = false;
    }
  }

  async confirmarEliminarEntrada() {
    if (!this.entradaSeleccionada) return;

    const entrada = this.entradasPasadas.find(e => e.id === this.entradaSeleccionada);
    if (!entrada) return;

    const result = await Swal.fire({
      title: '¿Cancelar esta entrada?',
      html: `<p>Cantidad: <strong>$${entrada.cantidad.toFixed(2)}</strong></p><p>Detalle: ${entrada.detalle}</p>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, cancelar entrada',
      cancelButtonText: 'No'
    });

    if (result.isConfirmed) {
      await this.eliminarEntrada();
    }
  }

  async eliminarEntrada() {
    if (!this.entradaSeleccionada) return;

    this.eliminando = true;
    try {
      await this.entradasService.eliminarEntrada(this.entradaSeleccionada);
      
      Swal.fire({
        icon: 'success',
        title: 'Entrada cancelada',
        timer: 1500,
        showConfirmButton: false
      });

      this.entradaSeleccionada = null;
      this.cargarEntradasDelDia();
    } catch (error) {
      console.error('Error al eliminar entrada:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo cancelar la entrada'
      });
    } finally {
      this.eliminando = false;
    }
  }

  cerrarModal() {
    this.limpiarFormulario();
    this.entradaSeleccionada = null;
    this.mostrarEntradas = false;
    Swal.close();
  }

  limpiarFormulario() {
    this.formularioEntrada.reset();
    this.formularioEntrada.markAsPristine();
    this.formularioEntrada.markAsUntouched();
    this.formularioEntrada.patchValue({
      cantidad: '',
      detalle: ''
    });
  }
}

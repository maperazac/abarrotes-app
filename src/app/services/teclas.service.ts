import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class TeclasService {

  // Verifica si la tecla es permitida (letras A-Z, números 0-9, y caracteres especiales españoles)
  esTeclaPermitida(event: KeyboardEvent): boolean {
    const tecla = event.key;
    // Letras A-Z y caracteres especiales del español (ñ, acentos)
    const esLetra = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ]$/.test(tecla);

    // Números 0-9
    const esNumero = /^[0-9]$/.test(tecla);

    // Teclas especiales permitidas
    const esTeclaEspecial = ['Enter', 'Backspace', '.', ' ', 'Tab', ',', '-', '_', '(', ')', '/', ':'].includes(tecla);

    // Incluye el numpad Enter (Code: NumpadEnter)
    const esNumpadEnter = event.code === 'NumpadEnter';

    return esLetra || esNumero || esTeclaEspecial || esNumpadEnter;
  }
}
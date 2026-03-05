import { Timestamp } from "@angular/fire/firestore";

export default interface EntradaDineroInterface {
    id?: string;
    fecha: Timestamp;
    cantidad: number;
    detalle: string;
    idCajero?: string;
}

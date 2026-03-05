import { Timestamp } from "@angular/fire/firestore";

export default interface SalidaDineroInterface {
    id?: string;
    fecha: Timestamp;
    cantidad: number;
    detalle: string;
    idCajero?: string;
}

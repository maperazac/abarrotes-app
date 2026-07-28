# Pasos para desplegar reglas e índices de Firebase

## ✅ Problemas resueltos

### 1. Error "Las reglas de seguridad están bloqueando el acceso"

**Causa:** La aplicación usaba la API REST de Firebase Authentication directamente en lugar del SDK de Firebase Auth. Esto causaba que Firestore no reconociera al usuario como autenticado.

**Solución aplicada:** Se modificó el `AuthService` para usar correctamente el SDK de Firebase Auth (`@angular/fire/auth`):
- Método `login()` ahora usa `signInWithEmailAndPassword()`
- Método `nuevoUsuario()` ahora usa `createUserWithEmailAndPassword()`
- Método `logout()` ahora usa `signOut()`

Con estos cambios, Firestore reconoce automáticamente la autenticación del usuario y las reglas de seguridad funcionan correctamente.

### 2. Error "No se pudo cargar el estado de cuenta del cliente"

**Causa:** Faltaban las reglas de seguridad y los índices compuestos para las colecciones de clientes.

**Solución:** Se agregaron las reglas para `clientes`, `ventasCredito` y `abonos`, y se crearon los índices necesarios.

---

## Autenticación (si necesitas desplegar reglas/índices manualmente)

1. Ejecuta en la terminal:
   ```bash
   firebase login
   ```
   Esto abrirá tu navegador para que inicies sesión con tu cuenta de Google.

2. Después de autenticarte, ejecuta:
   ```bash
   firebase use abarrotes-app-1b9ff
   ```

3. Despliega las reglas:
   ```bash
   firebase deploy --only firestore:rules
   ```

4. Despliega los índices:
   ```bash
   firebase deploy --only firestore:indexes
   ```

## Verificación

Después de desplegar, recarga tu aplicación y el error "No se pudo cargar el estado de cuenta del cliente" debería desaparecer.

Los índices pueden tardar unos minutos en construirse. Firebase te enviará un correo cuando estén listos.

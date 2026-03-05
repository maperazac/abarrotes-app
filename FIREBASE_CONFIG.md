# Configuración de Firebase para Abarrotes App

## Problema Actual
La aplicación no se conecta a Firebase Firestore. Esto puede deberse a:
1. **Reglas de seguridad** no configuradas
2. **Usuario no autenticado** con Firebase Auth
3. **Falta de índices** compuestos en Firestore

---

## Solución Paso a Paso

### 1. Configurar las Reglas de Firestore

Ve a la [Consola de Firebase](https://console.firebase.google.com/):

1. Selecciona tu proyecto: **abarrotes-app-1b9ff**
2. En el menú lateral, ve a **Firestore Database**
3. Haz clic en la pestaña **Rules** (Reglas)
4. Copia y pega las siguientes reglas:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Reglas para la colección de ventas
    match /ventas/{ventaId} {
      allow read, write: if request.auth != null;
    }
    
    // Reglas para detalleVentas
    match /detalleVentas/{detalleId} {
      allow read, write: if request.auth != null;
    }
    
    // Reglas para productos
    match /productos/{productoId} {
      allow read, write: if request.auth != null;
    }
    
    // Reglas para departamentos
    match /departamentos/{departamentoId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

5. Haz clic en **Publicar**

**IMPORTANTE**: Estas reglas requieren que el usuario esté autenticado con Firebase Auth.

---

### 2. Verificar Autenticación

El problema puede ser que tu app usa un sistema de autenticación personalizado (API de Identity Toolkit), pero Firestore requiere Firebase Auth.

#### Opción A: Reglas Temporales para Desarrollo (NO RECOMENDADO PARA PRODUCCIÓN)

Si solo quieres probar que la app funcione, usa estas reglas temporales:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;  // ⚠️ PELIGRO: Permite acceso a todos
    }
  }
}
```

⚠️ **ADVERTENCIA**: Esto permite que cualquiera lea y modifique tu base de datos. Solo úsalo para desarrollo local.

#### Opción B: Integrar Firebase Auth (RECOMENDADO)

Necesitas modificar tu servicio de autenticación para usar Firebase Auth en lugar de la API REST directa. Puedo ayudarte con esto si es necesario.

---

### 3. Verificar en la Consola del Navegador

1. Abre la aplicación en el navegador
2. Presiona **F12** para abrir las herramientas de desarrollador
3. Ve a la pestaña **Console**
4. Busca mensajes de error en rojo que digan:
   - `permission-denied` → El problema son las reglas de seguridad
   - `failed-precondition` o `index` → Falta un índice compuesto

---

### 4. Crear Índices (si es necesario)

Si ves un error que menciona "index", Firebase te proporcionará un enlace en la consola:

```
https://console.firebase.google.com/...
```

Haz clic en ese enlace y Firebase creará el índice automáticamente.

Alternativamente, ve a:
1. **Firestore Database** → **Indexes** (Índices)
2. Crea los siguientes índices compuestos:

**Índice 1:**
- Colección: `ventas`
- Campos que indexar:
  - `status` (Ascending)
  - `fechaVentaIniciada` (Ascending)

**Índice 2:**
- Colección: `ventas`
- Campos que indexar:
  - `status` (Ascending)
  - `fechaVentaFinalizada` (Ascending)

---

## Verificación

Después de configurar las reglas:

1. Recarga la aplicación (Ctrl + R)
2. Inicia sesión con un usuario válido
3. Ve a la página de ventas
4. Revisa la consola del navegador (F12) para ver los mensajes de log:
   - `Consultando ventas con status: 0`
   - `Ventas obtenidas: [número]`

---

## Comandos Útiles

### Iniciar la aplicación
```bash
npm start
```

### Ver logs en tiempo real
Abre la consola del navegador (F12) → pestaña Console

---

## ¿Necesitas Ayuda?

1. Abre la consola del navegador (F12)
2. Copia los errores que aparezcan en rojo
3. Compártelos para obtener ayuda más específica

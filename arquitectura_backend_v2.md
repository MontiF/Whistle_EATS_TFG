# Evolución Arquitectónica: De CSV a Arquitectura Enterprise (CAP + Supabase)

Este documento resume la mejora técnica realizada en el backend de **WhistleEats** para pasar de una gestión de datos manual a un sistema robusto, escalable y profesional.

## 1. El modelo anterior (Basado en CSV)
Antes, el proyecto dependía de archivos `.csv` sueltos en la carpeta `backend/db/data/`.

*   **Problemas**:
    *   **Descentralización**: Si el equipo quería añadir un dato de prueba, debía editar archivos de texto propensos a errores de formato.
    *   **Lógica en el Front**: El Frontend (Angular) hablaba directamente con Supabase para registrar usuarios. Si la lógica de registro cambiaba, había que actualizar el código en varios sitios.
    *   **Fragilidad**: No había validación real en el backend; el Front "inyectaba" datos directamente en la base de datos.
    *   **Persistencia manual**: Cada vez que se desplegaba, el script tenía que leer y parsear archivos de texto, un proceso lento y "sucio".

## 2. El nuevo modelo (Enterprise)
Hemos profesionalizado el flujo centralizando todo en el **Backend (SAP CAP)**.

### A. Registro Centralizado (`registerUser`)
Ahora, Angular ya no toca las tablas de Supabase directamente. Envía una petición `POST` al Backend de CAP.
*   **Beneficio**: El Backend se encarga de que la creación sea **atómica** (se crea el usuario y su perfil específico a la vez). Esto asegura la integridad de los datos.

### B. Seeding Programático (`seed-db.js`)
Hemos eliminado todos los archivos CSV. Ahora los datos de prueba viven dentro de un script de JavaScript.
*   **Beneficio**: Es mucho más rápido, no hay errores de "archivo no encontrado" y es más fácil de mantener. Cualquier programador puede añadir datos nuevos editando un objeto JS claro.

### C. Conectividad Optimizada (IPv4 Forzado)
Hemos solucionado problemas de red mediante una configuración quirúrgica en Docker y el conector de Postgres.
*   **Beneficio**: Se han eliminado los "cuelgues" de carga infinita al navegar por las entidades. La comunicación entre servidores ahora es directa y estable.

## 3. Resumen de Herramientas
| Antes (V1) | Ahora (V2) |
| :--- | :--- |
| **Datos**: 20 archivos CSV | **Datos**: Script `seed-db.js` (JS puro) |
| **Registro**: Angular -> Supabase | **Registro**: Angular -> **CAP (Backend)** -> Supabase |
| **Despliegue**: Solo estructura | **Despliegue**: Estructura + Vistas OData automáticas |
| **Mantenimiento**: Manual y frágil | **Mantenimiento**: Programático y robusto |

---
> [!TIP]
> **Nota para el equipo**: A partir de ahora, tratad al Backend como el único dueño de la verdad. El Front solo "pide", el Backend "decide y guarda".

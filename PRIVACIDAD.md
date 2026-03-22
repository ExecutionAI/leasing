# Checklist de Privacidad y Seguridad — Omar Leasing

Última actualización: 22 de marzo de 2026

---

## Contexto del sistema

Este CRM es una **herramienta personal de gestión** para Omar, no un producto de empresa. Omar maneja dos tipos de clientes:

- **Clientes directos:** personas que contactan a Omar independientemente — él es el responsable de sus datos.
- **Clientes de la empresa:** Omar los atiende como empleado; los datos oficiales viven en Power Apps (CRM corporativo). Este sistema solo conserva notas de trabajo y seguimiento personal — **no reemplaza ni duplica el expediente oficial**.

Los contratos PDF que se parsean son generados por el área legal de la empresa; el sistema los procesa y descarta — **no los almacena**.

---

## 🔴 Antes de salir a producción (obligatorio)

### 1. Aviso de Privacidad (clientes directos)

Aplica solo para los clientes directos de Omar, no para los de la empresa.

- [ ] Redactar un aviso breve con:
  - Nombre del responsable: Omar Alejandro Pérez Montiel
  - Finalidad: seguimiento personal de gestión de arrendamiento, contacto comercial
  - Transferencia a terceros: procesamiento automatizado con **OpenAI (EUA)** vía API
  - Canal para derechos ARCO (puede ser su email de trabajo o uno dedicado)
- [ ] Publicar el aviso en la landing page (`index.html`) — footer con enlace o modal
- [ ] **No es necesario** un email formal `privacidad@omarleasing.mx` en esta etapa — su email personal/profesional es suficiente mientras el volumen sea pequeño

### 2. Seguridad del ADMIN_TOKEN

- [ ] Generar un token nuevo y robusto (mínimo 32 caracteres aleatorios):
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- [ ] Actualizar `ADMIN_TOKEN` en `.env` local y en Render (variables de entorno de producción)
- [ ] Guardar el token en un gestor de contraseñas (1Password, Bitwarden, etc.)

### 3. Rate limiting en la API

- [ ] Instalar `express-rate-limit`:
  ```bash
  npm install express-rate-limit
  ```
- [ ] Aplicar límite global (~60 req/min) y límite estricto en rutas de IA (~5 req/min) para evitar abuso de la clave de OpenAI

### 4. Límite de gasto en OpenAI

- [ ] Entrar a platform.openai.com → Billing → Usage limits
- [ ] Configurar límite mensual (sugerido: $20–50 USD)
- [ ] Activar alertas de gasto al 80% del límite

---

## 🟡 Antes de tener más de 10 clientes activos

### 5. Almacenamiento de contratos PDF

Omar confirmó: *"con los datos en sistema es suficiente."* El flujo actual (parsear y descartar) es correcto dado que:

- Los PDFs son contratos de la empresa, no de Omar personalmente
- El original siempre existe en el área legal de la empresa

**Acción:** mantener el flujo actual de parse-and-discard. No almacenar los PDFs en Supabase.

- [ ] Verificar que ninguna ruta de la API guarda el buffer del PDF en base de datos o en disco tras el parseo

### 6. Validación de archivos subidos

- [ ] Verificar el MIME type real del buffer antes de procesarlo (no solo la extensión `.pdf`)
- [ ] Limitar tamaño máximo de archivo (sugerido: 10 MB)

### 7. Log de auditoría básico

- [ ] Registrar en Supabase (tabla `audit_log`) las acciones críticas:
  - Cliente creado / editado / eliminado
  - Deal creado / eliminado / cambio de status
  - PDF subido y parseado
- [ ] Campos mínimos: `action`, `entity`, `entity_id`, `timestamp`, `ip`

---

## 🟢 Si el negocio crece (más clientes directos o más usuarios)

### 8. Autenticación real

- [ ] Migrar de token compartido a **Supabase Auth** (email + contraseña)
- [ ] Útil si Omar incorpora un asistente o colega que también use el sistema

### 9. Política interna de datos (1 página)

Solo necesaria si el sistema crece o si Omar formaliza su operación independiente:

- [ ] Qué datos se recaban y por qué
- [ ] Cuánto tiempo se conservan
- [ ] Quién tiene acceso
- [ ] Procedimiento en caso de brecha

### 10. Cifrado de campos sensibles

- [ ] Evaluar cifrado a nivel de columna para RFC y datos bancarios si se agregan en el futuro
- [ ] Supabase ya cifra en reposo (AES-256); cifrado de aplicación añade una capa extra si los datos son de clientes directos con información muy sensible

---

## Nota sobre OpenAI y transferencia internacional de datos

Cuando Omar usa las funciones de IA (parseo de WhatsApp o PDF), los datos pasan por servidores de OpenAI en EUA. Esto constituye una **transferencia internacional** bajo la LFPDPPP.

**Mitigaciones aplicables:**
- OpenAI no usa datos de API para entrenar modelos (a diferencia del producto ChatGPT)
- Para clientes de la empresa: el parseo procesa el PDF y lo descarta — no persiste datos en nombre de la empresa
- Para clientes directos: mencionar en el Aviso de Privacidad
- Si algún cliente lo solicita, Omar puede ingresar los datos manualmente en lugar de usar el parseo por IA

---

## Referencias

- Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP): dof.gob.mx
- Portal INAI: inai.org.mx
- Lineamientos de OpenAI para uso de API (no entrenamiento): platform.openai.com/privacy

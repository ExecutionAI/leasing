# Checklist de Privacidad y Seguridad — Omar Leasing

Última actualización: 21 de marzo de 2025

---

## 🔴 Antes de salir a producción (obligatorio)

### 1. Aviso de Privacidad
- [ ] Redactar el Aviso de Privacidad con los siguientes datos:
  - Nombre y domicilio del responsable (Omar Alejandro Pérez Montiel)
  - RFC del responsable
  - Finalidades del tratamiento: gestión de contratos de arrendamiento, contacto comercial, facturación, seguimiento de cartera
  - Transferencias a terceros: mencionar explícitamente que se usa **OpenAI (EUA)** para procesamiento automatizado de datos con IA
  - Canal para ejercer derechos ARCO (email designado)
  - Fecha de última actualización
- [ ] Publicar el aviso en la landing page (`index.html`) — footer con enlace o modal
- [ ] Crear email designado para derechos ARCO, ej: `privacidad@omarleasing.mx`

### 2. Seguridad del ADMIN_TOKEN
- [ ] Generar un token nuevo y robusto (mínimo 32 caracteres aleatorios):
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- [ ] Actualizar `ADMIN_TOKEN` en `.env` local y en Render (variables de entorno de producción)
- [ ] Omar debe guardarlo en un gestor de contraseñas (1Password, Bitwarden, etc.)

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
- [ ] Guardar los PDFs originales en **Supabase Storage** (no solo parsearlos y descartarlos)
- [ ] Vincular el archivo almacenado al deal correspondiente (`contract_url` en tabla `leasing_deals`)
- [ ] Esto protege a Omar si la extracción de IA tiene un error — siempre tiene el original

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

## 🟢 Si el negocio crece (más de 1 usuario usando el CRM)

### 8. Autenticación real
- [ ] Migrar de token compartido a **Supabase Auth** (email + contraseña por usuario)
- [ ] Cada sesión identificada individualmente — el log de auditoría cobra más valor

### 9. Documento interno de política de datos
- [ ] Redactar una política interna de 1 página que describa:
  - Qué datos se recaban
  - Cuánto tiempo se conservan
  - Quién tiene acceso
  - Procedimiento en caso de brecha de seguridad
- [ ] Esto es requerido por el Reglamento de la LFPDPPP (Art. 48)

### 10. Cifrado de campos sensibles
- [ ] Evaluar cifrado a nivel de columna en Supabase para: RFC, datos bancarios si se agregan en el futuro
- [ ] Supabase ya cifra en reposo (AES-256), pero cifrado a nivel de aplicación añade una capa extra

---

## Nota sobre OpenAI y transferencia internacional de datos

Cuando Omar usa las funciones de IA (parseo de WhatsApp o PDF), los datos personales de sus clientes salen de México hacia servidores de OpenAI en EUA. Esto constituye una **transferencia internacional** bajo la LFPDPPP.

**Mitigaciones:**
- OpenAI tiene política de no usar datos de API para entrenamiento de modelos (a diferencia del producto ChatGPT)
- Esto debe mencionarse en el Aviso de Privacidad
- Omar puede optar por anonimizar/generalizar los datos antes de enviarlos si hay clientes que lo soliciten

---

## Referencias
- Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP): dof.gob.mx
- Portal INAI: inai.org.mx
- Lineamientos de OpenAI para uso de API (no entrenamiento): platform.openai.com/privacy

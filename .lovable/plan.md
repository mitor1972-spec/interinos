# Plan: exportación segura a Hispajuris + dos arreglos

Todo es aditivo. No se tocan el formulario (campos/lógica), `leads_interinos` (columnas/datos) ni los paneles existentes, salvo 3a y 3b.

## Qué se ha comprobado (solo lectura)

- 89 solicitudes; 10 asignadas, a 2 valores distintos de `asignado_a`.
- Los 10 valores existen en `auth.users` y coinciden con `abogados.user_id`. **Ninguno** coincide con `abogados.id`.
- El trigger `asignar_abogado_por_provincia()` guarda `abogados.user_id` en `asignado_a`.
- Por eso las políticas "Lawyers view assigned or admin" y "Lawyers update assigned or admin" (`a.id = asignado_a AND a.user_id = auth.uid()`) nunca se cumplen: hoy los abogados no ven sus casos; solo los administradores.
- En el formulario, línea 627: `<a href="#">política de privacidad</a>` dentro de una casilla obligatoria de "He leído y acepto".

## Decisión que necesito que confirmes: dónde vive el endpoint

Este proyecto ya no admite **nuevas** funciones en `/functions/v1/...` (solo se mantienen las que ya existen). La alternativa equivalente y compatible:

- `POST https://interinos.asesor.legal/api/public/hispajuris-export` (una ruta de servidor de la propia app; el prefijo `/api/public` solo evita el login del sitio publicado, la seguridad la da la firma HMAC).
- Contrato idéntico, cambia solo la ruta firmada: `${ts}.${nonce}.POST./api/public/hispajuris-export.${sha256hex(body)}`.
- Para que el contrato sea común con Pensión/Brecha, recomiendo que el portal firme la **ruta de la URL configurada** por vertical (no un valor fijo). Si prefieres mantener literalmente `/functions/v1/hispajuris-export`, la función acepta ese texto en la firma aunque se sirva desde otra URL (opción B), pero es menos limpio.

## 1. Endpoint hispajuris-export

Flujo por petición:

```text
POST -> método != POST: 405 (sin CORS; OPTIONS no permitido)
     -> leer body crudo (máx 8 KB)
     -> cabeceras presentes, key-id == HISPAJURIS_EXPORT_KEY_ID      else 401
     -> |now - ts| <= 120 s                                          else 401
     -> firma HMAC comparada en tiempo constante                     else 401
     -> INSERT nonce (PK); si ya existe                               409
     -> validación Zod del body                                       else 400 genérico
     -> ejecutar acción, registrar en export_log, responder JSON (Cache-Control: no-store)
```

- `summary`: métricas agregadas con consultas `count` (total, 7d, 30d, por `estado`, `semaforo`, `resultado_viabilidad`, asignados/no asignados, contactados = estado distinto de "Nuevo", firmados = "Cliente", pagados = `pago_completado`, `last_case_at`, por provincia). `demo.count` = 0 (este vertical no guarda demos en la tabla).
- `cases`: selección explícita solo de `id, created_at, estado, semaforo, resultado_viabilidad, provincia, tipo_relacion, asignado_a`. Salida: `ref` = primeros 16 hex de HMAC(secret, id), `claim_type` = `tipo_relacion`, `assigned` = `asignado_a != null`, `is_demo: false`, `detail_url` = `https://interinos.asesor.legal/admin/casos/{id}`.
  - Nota: el `detail_url` necesariamente contiene el id real para abrir la ficha; solo sirve tras iniciar sesión aquí. Si no quieres exponerlo, alternativa: `/admin/casos?ref={ref}` que resuelve el ref tras el login (lo añadiría de forma aditiva). Indícame cuál.
  - Paginación: orden `created_at desc, id desc`; `cursor` opaco (base64 de `created_at|id`); `since` filtra `created_at >= since`.
- Lista blanca de campos de salida: se construye cada objeto campo a campo; nunca `select *`.
- Acceso a datos con el cliente de servicio, cargado dentro del manejador tras validar la firma.

## 2. Tests (Vitest, sin tocar datos reales)

Lógica pura en un módulo aparte (firma, ventana, validación, construcción de respuesta) con datos simulados:
- firma correcta aceptada; firma/cuerpo/ruta alterados → 401; key-id erróneo → 401.
- timestamp a ±121 s → 401; a ±119 s → OK.
- nonce repetido → 409 (almacén de nonces simulado).
- Zod: acción inválida, `limit` 0/201, `since` no ISO, campos extra → 400.
- Filas simuladas con nombre, email, teléfono, mensaje, documentos, importes: se comprueba que ninguna clave ni valor aparece en el JSON serializado.
- Prueba final opcional contra el entorno con un script firmado que solo llama a `summary` y `cases limit=1` (lectura).

## 3a. Página /privacidad

- Nueva ruta `/privacidad` con texto RGPD: responsable (campos `[Razón social] [NIF] [Domicilio] [Email DPD]` a completar), finalidad (estudio de viabilidad y, en su caso, derivación a un despacho de la red Hispajuris), base jurídica (consentimiento y medidas precontractuales), destinatarios (despachos de la red Hispajuris y encargados técnicos), conservación, derechos (acceso, rectificación, supresión, oposición, limitación, portabilidad, reclamación ante AEPD), contacto. Pie: "Borrador pendiente de revisión jurídica". Metadatos propios.
- Formulario: solo cambio de `href="#"` a `/privacidad` (nueva pestaña) y el texto de la casilla pasa a: "He leído y acepto la política de privacidad y la posible comunicación de mis datos a un despacho de la red de abogados Hispajuris para la gestión de mi caso." Mismos campos, misma validación.

## 3b. Corrección mínima de permisos

Migración (solo reemplaza las dos políticas, misma lógica de admin):

```sql
DROP POLICY "Lawyers view assigned or admin" ON public.leads_interinos;
CREATE POLICY "Lawyers view assigned or admin" ON public.leads_interinos
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin') OR asignado_a = auth.uid());

DROP POLICY "Lawyers update assigned or admin" ON public.leads_interinos;
CREATE POLICY "Lawyers update assigned or admin" ON public.leads_interinos
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'admin') OR asignado_a = auth.uid())
  WITH CHECK (has_role(auth.uid(),'admin') OR asignado_a = auth.uid());
```

Solo quien es el usuario asignado ve/edita ese caso; nadie más gana acceso. Antes, verificaré que la asignación manual desde el panel (`AsignacionAbogado`) también guarda `user_id`; si guardara `abogados.id`, lo indicaré antes de tocar nada.

## Migración del endpoint

```sql
CREATE TABLE public.export_nonces (
  nonce text PRIMARY KEY, key_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX ON public.export_nonces (created_at);
CREATE TABLE public.export_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  key_id text, action text, rows_returned int, status int);
GRANT ALL ON public.export_nonces, public.export_log TO service_role;
GRANT SELECT ON public.export_log TO authenticated;
ALTER TABLE public.export_nonces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.export_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read export log" ON public.export_log
  FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin'));
```

Limpieza TTL: en cada llamada se borran nonces de más de 10 minutos (sin cron).

## Secretos

Pediré que añadas `HISPAJURIS_EXPORT_KEY_ID` y `HISPAJURIS_EXPORT_SECRET` en Ajustes → Secretos. Sin ellos el endpoint responde 401 siempre (fallo seguro).

## Riesgos

- 3b hace que los 2 abogados asignados empiecen a ver sus 10 casos (efecto deseado); conviene avisarles.
- `detail_url` con id real (ver opción arriba).
- Diferencia de ruta firmada respecto a Pensión/Brecha si no se adopta "firmar la ruta configurada".
- Métricas "contactado/firmado" se derivan del estado; confírmame si la definición sirve.

## Cómo probar sin tocar datos reales

- Tests unitarios con datos simulados.
- Llamadas firmadas de solo lectura (`summary`, `cases limit=1`).
- 3b: comprobar en consulta de solo lectura con el rol del abogado (sesión de prueba) que ve exactamente sus casos y ninguno más.
- 3a: revisión visual de `/privacidad` y del enlace; sin enviar formularios.

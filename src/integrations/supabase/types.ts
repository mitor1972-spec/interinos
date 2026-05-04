export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      abogados: {
        Row: {
          activo: boolean
          colegio: string | null
          created_at: string
          despacho_id: string | null
          domicilio_profesional: string | null
          email: string
          id: string
          nif: string | null
          nombre: string
          notas: string | null
          num_colegiado: string | null
          telefono: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          activo?: boolean
          colegio?: string | null
          created_at?: string
          despacho_id?: string | null
          domicilio_profesional?: string | null
          email: string
          id?: string
          nif?: string | null
          nombre: string
          notas?: string | null
          num_colegiado?: string | null
          telefono?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          activo?: boolean
          colegio?: string | null
          created_at?: string
          despacho_id?: string | null
          domicilio_profesional?: string | null
          email?: string
          id?: string
          nif?: string | null
          nombre?: string
          notas?: string | null
          num_colegiado?: string | null
          telefono?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "abogados_despacho_id_fkey"
            columns: ["despacho_id"]
            isOneToOne: false
            referencedRelation: "despachos"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracion_despacho: {
        Row: {
          banco: string
          cif: string
          created_at: string
          cuota_litis_default: number
          domicilio: string
          email_secretariado: string
          honorarios_fase1_default: number
          iban: string
          id: string
          logo_path: string | null
          nombre: string
          razon_social: string
          updated_at: string
        }
        Insert: {
          banco?: string
          cif?: string
          created_at?: string
          cuota_litis_default?: number
          domicilio?: string
          email_secretariado?: string
          honorarios_fase1_default?: number
          iban?: string
          id?: string
          logo_path?: string | null
          nombre?: string
          razon_social?: string
          updated_at?: string
        }
        Update: {
          banco?: string
          cif?: string
          created_at?: string
          cuota_litis_default?: number
          domicilio?: string
          email_secretariado?: string
          honorarios_fase1_default?: number
          iban?: string
          id?: string
          logo_path?: string | null
          nombre?: string
          razon_social?: string
          updated_at?: string
        }
        Relationships: []
      }
      despachos: {
        Row: {
          activo: boolean
          ciudad: string | null
          created_at: string
          email: string | null
          id: string
          nombre: string
          notas: string | null
          telefono: string | null
          updated_at: string
        }
        Insert: {
          activo?: boolean
          ciudad?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nombre: string
          notas?: string | null
          telefono?: string | null
          updated_at?: string
        }
        Update: {
          activo?: boolean
          ciudad?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nombre?: string
          notas?: string | null
          telefono?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      lead_documento_extracciones: {
        Row: {
          categoria: Database["public"]["Enums"]["documento_categoria"]
          created_at: string
          datos: Json | null
          documento_id: string
          error_mensaje: string | null
          estado: Database["public"]["Enums"]["extraccion_estado"]
          id: string
          intentos: number
          lead_id: string
          modelo: string | null
          updated_at: string
          validado_at: string | null
          validado_por: string | null
          validado_por_email: string | null
        }
        Insert: {
          categoria: Database["public"]["Enums"]["documento_categoria"]
          created_at?: string
          datos?: Json | null
          documento_id: string
          error_mensaje?: string | null
          estado?: Database["public"]["Enums"]["extraccion_estado"]
          id?: string
          intentos?: number
          lead_id: string
          modelo?: string | null
          updated_at?: string
          validado_at?: string | null
          validado_por?: string | null
          validado_por_email?: string | null
        }
        Update: {
          categoria?: Database["public"]["Enums"]["documento_categoria"]
          created_at?: string
          datos?: Json | null
          documento_id?: string
          error_mensaje?: string | null
          estado?: Database["public"]["Enums"]["extraccion_estado"]
          id?: string
          intentos?: number
          lead_id?: string
          modelo?: string | null
          updated_at?: string
          validado_at?: string | null
          validado_por?: string | null
          validado_por_email?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_documento_extracciones_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: true
            referencedRelation: "lead_documentos"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_documentos: {
        Row: {
          categoria: Database["public"]["Enums"]["documento_categoria"]
          created_at: string
          estado: Database["public"]["Enums"]["documento_estado"]
          id: string
          lead_id: string
          mime_type: string | null
          motivo_rechazo: string | null
          nombre_original: string
          notas: string | null
          notificacion_rechazo_at: string | null
          revisado_at: string | null
          revisado_por: string | null
          revisado_por_email: string | null
          storage_path: string
          subido_por: string | null
          subido_por_email: string | null
          tamano_bytes: number | null
          updated_at: string
        }
        Insert: {
          categoria?: Database["public"]["Enums"]["documento_categoria"]
          created_at?: string
          estado?: Database["public"]["Enums"]["documento_estado"]
          id?: string
          lead_id: string
          mime_type?: string | null
          motivo_rechazo?: string | null
          nombre_original: string
          notas?: string | null
          notificacion_rechazo_at?: string | null
          revisado_at?: string | null
          revisado_por?: string | null
          revisado_por_email?: string | null
          storage_path: string
          subido_por?: string | null
          subido_por_email?: string | null
          tamano_bytes?: number | null
          updated_at?: string
        }
        Update: {
          categoria?: Database["public"]["Enums"]["documento_categoria"]
          created_at?: string
          estado?: Database["public"]["Enums"]["documento_estado"]
          id?: string
          lead_id?: string
          mime_type?: string | null
          motivo_rechazo?: string | null
          nombre_original?: string
          notas?: string | null
          notificacion_rechazo_at?: string | null
          revisado_at?: string | null
          revisado_por?: string | null
          revisado_por_email?: string | null
          storage_path?: string
          subido_por?: string | null
          subido_por_email?: string | null
          tamano_bytes?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_documentos_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads_interinos"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_documentos_generados: {
        Row: {
          created_at: string
          formato: Database["public"]["Enums"]["documento_generado_formato"]
          generado_por: string | null
          generado_por_email: string | null
          id: string
          lead_id: string
          nombre_archivo: string
          notas: string | null
          plantilla_id: string | null
          plantilla_nombre: string | null
          storage_path: string
          tamano_bytes: number | null
        }
        Insert: {
          created_at?: string
          formato?: Database["public"]["Enums"]["documento_generado_formato"]
          generado_por?: string | null
          generado_por_email?: string | null
          id?: string
          lead_id: string
          nombre_archivo: string
          notas?: string | null
          plantilla_id?: string | null
          plantilla_nombre?: string | null
          storage_path: string
          tamano_bytes?: number | null
        }
        Update: {
          created_at?: string
          formato?: Database["public"]["Enums"]["documento_generado_formato"]
          generado_por?: string | null
          generado_por_email?: string | null
          id?: string
          lead_id?: string
          nombre_archivo?: string
          notas?: string | null
          plantilla_id?: string | null
          plantilla_nombre?: string | null
          storage_path?: string
          tamano_bytes?: number | null
        }
        Relationships: []
      }
      lead_historial: {
        Row: {
          campo: string
          created_at: string
          id: string
          lead_id: string
          usuario_email: string | null
          usuario_id: string | null
          valor_anterior: string | null
          valor_nuevo: string | null
        }
        Insert: {
          campo: string
          created_at?: string
          id?: string
          lead_id: string
          usuario_email?: string | null
          usuario_id?: string | null
          valor_anterior?: string | null
          valor_nuevo?: string | null
        }
        Update: {
          campo?: string
          created_at?: string
          id?: string
          lead_id?: string
          usuario_email?: string | null
          usuario_id?: string | null
          valor_anterior?: string | null
          valor_nuevo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_historial_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads_interinos"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_validaciones_ia: {
        Row: {
          avisos: Json
          created_at: string
          datos_analizados: Json | null
          generado_por: string | null
          generado_por_email: string | null
          id: string
          incoherencias: Json
          lead_id: string
          modelo: string | null
          resumen: string | null
        }
        Insert: {
          avisos?: Json
          created_at?: string
          datos_analizados?: Json | null
          generado_por?: string | null
          generado_por_email?: string | null
          id?: string
          incoherencias?: Json
          lead_id: string
          modelo?: string | null
          resumen?: string | null
        }
        Update: {
          avisos?: Json
          created_at?: string
          datos_analizados?: Json | null
          generado_por?: string | null
          generado_por_email?: string | null
          id?: string
          incoherencias?: Json
          lead_id?: string
          modelo?: string | null
          resumen?: string | null
        }
        Relationships: []
      }
      lead_valoraciones: {
        Row: {
          antiguedad_reconocida: number
          costas: number
          created_at: string
          danos_perjuicios: number
          estado: Database["public"]["Enums"]["estado_valoracion"]
          fecha_valoracion: string
          id: string
          indemnizacion_principal: number
          intereses: number
          lead_id: string
          moneda: string
          notas: string | null
          otros_concepto: string | null
          otros_importe: number
          perito_email: string | null
          perito_user_id: string | null
          salarios_tramitacion: number
          total: number
          updated_at: string
        }
        Insert: {
          antiguedad_reconocida?: number
          costas?: number
          created_at?: string
          danos_perjuicios?: number
          estado?: Database["public"]["Enums"]["estado_valoracion"]
          fecha_valoracion?: string
          id?: string
          indemnizacion_principal?: number
          intereses?: number
          lead_id: string
          moneda?: string
          notas?: string | null
          otros_concepto?: string | null
          otros_importe?: number
          perito_email?: string | null
          perito_user_id?: string | null
          salarios_tramitacion?: number
          total?: number
          updated_at?: string
        }
        Update: {
          antiguedad_reconocida?: number
          costas?: number
          created_at?: string
          danos_perjuicios?: number
          estado?: Database["public"]["Enums"]["estado_valoracion"]
          fecha_valoracion?: string
          id?: string
          indemnizacion_principal?: number
          intereses?: number
          lead_id?: string
          moneda?: string
          notas?: string | null
          otros_concepto?: string | null
          otros_importe?: number
          perito_email?: string | null
          perito_user_id?: string | null
          salarios_tramitacion?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_valoraciones_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads_interinos"
            referencedColumns: ["id"]
          },
        ]
      }
      leads_interinos: {
        Row: {
          accion_pendiente: string | null
          administracion: string
          anos_servicio: number
          apud_acta_recibido: boolean
          area_sector: Database["public"]["Enums"]["area_sector"] | null
          asignado_a: string | null
          cobro_realizado: boolean
          contratos_sucesivos: boolean
          created_at: string
          diagnostico_mensaje: string | null
          diagnostico_titulo: string | null
          documentos_disponibles: string[]
          email: string
          encargo_firmado: boolean
          estado: Database["public"]["Enums"]["estado_caso"]
          factura_emitida: boolean
          fecha_solicitud_inicial: string | null
          id: string
          mensaje_libre: string | null
          metodo_pago: Database["public"]["Enums"]["metodo_pago"] | null
          motivo_especifico: string | null
          nombre: string
          notas_abogado: string | null
          notificacion_docs_completos_at: string | null
          pago_completado: boolean
          pago_fecha: string | null
          pago_importe: number | null
          pago_referencia: string | null
          perfil: Database["public"]["Enums"]["perfil_tipo"]
          profesional_interviniente: string | null
          provincia: string
          puntuacion_viabilidad: number
          resultado_contacto: Database["public"]["Enums"]["resultado_contacto"]
          resultado_viabilidad: Database["public"]["Enums"]["resultado_viabilidad"]
          revisado: boolean
          revisado_at: string | null
          semaforo: Database["public"]["Enums"]["semaforo_tipo"]
          servicio_especifico: string | null
          siguiente_accion:
            | Database["public"]["Enums"]["siguiente_accion"]
            | null
          situacion_actual: string
          stripe_payment_id: string | null
          telefono: string
          tipo_reclamacion:
            | Database["public"]["Enums"]["tipo_reclamacion"]
            | null
          tipo_relacion: string
          updated_at: string
          urgencia: boolean
          urgencia_percibida: number | null
        }
        Insert: {
          accion_pendiente?: string | null
          administracion: string
          anos_servicio: number
          apud_acta_recibido?: boolean
          area_sector?: Database["public"]["Enums"]["area_sector"] | null
          asignado_a?: string | null
          cobro_realizado?: boolean
          contratos_sucesivos?: boolean
          created_at?: string
          diagnostico_mensaje?: string | null
          diagnostico_titulo?: string | null
          documentos_disponibles?: string[]
          email: string
          encargo_firmado?: boolean
          estado?: Database["public"]["Enums"]["estado_caso"]
          factura_emitida?: boolean
          fecha_solicitud_inicial?: string | null
          id?: string
          mensaje_libre?: string | null
          metodo_pago?: Database["public"]["Enums"]["metodo_pago"] | null
          motivo_especifico?: string | null
          nombre: string
          notas_abogado?: string | null
          notificacion_docs_completos_at?: string | null
          pago_completado?: boolean
          pago_fecha?: string | null
          pago_importe?: number | null
          pago_referencia?: string | null
          perfil?: Database["public"]["Enums"]["perfil_tipo"]
          profesional_interviniente?: string | null
          provincia: string
          puntuacion_viabilidad?: number
          resultado_contacto?: Database["public"]["Enums"]["resultado_contacto"]
          resultado_viabilidad?: Database["public"]["Enums"]["resultado_viabilidad"]
          revisado?: boolean
          revisado_at?: string | null
          semaforo: Database["public"]["Enums"]["semaforo_tipo"]
          servicio_especifico?: string | null
          siguiente_accion?:
            | Database["public"]["Enums"]["siguiente_accion"]
            | null
          situacion_actual: string
          stripe_payment_id?: string | null
          telefono: string
          tipo_reclamacion?:
            | Database["public"]["Enums"]["tipo_reclamacion"]
            | null
          tipo_relacion: string
          updated_at?: string
          urgencia?: boolean
          urgencia_percibida?: number | null
        }
        Update: {
          accion_pendiente?: string | null
          administracion?: string
          anos_servicio?: number
          apud_acta_recibido?: boolean
          area_sector?: Database["public"]["Enums"]["area_sector"] | null
          asignado_a?: string | null
          cobro_realizado?: boolean
          contratos_sucesivos?: boolean
          created_at?: string
          diagnostico_mensaje?: string | null
          diagnostico_titulo?: string | null
          documentos_disponibles?: string[]
          email?: string
          encargo_firmado?: boolean
          estado?: Database["public"]["Enums"]["estado_caso"]
          factura_emitida?: boolean
          fecha_solicitud_inicial?: string | null
          id?: string
          mensaje_libre?: string | null
          metodo_pago?: Database["public"]["Enums"]["metodo_pago"] | null
          motivo_especifico?: string | null
          nombre?: string
          notas_abogado?: string | null
          notificacion_docs_completos_at?: string | null
          pago_completado?: boolean
          pago_fecha?: string | null
          pago_importe?: number | null
          pago_referencia?: string | null
          perfil?: Database["public"]["Enums"]["perfil_tipo"]
          profesional_interviniente?: string | null
          provincia?: string
          puntuacion_viabilidad?: number
          resultado_contacto?: Database["public"]["Enums"]["resultado_contacto"]
          resultado_viabilidad?: Database["public"]["Enums"]["resultado_viabilidad"]
          revisado?: boolean
          revisado_at?: string | null
          semaforo?: Database["public"]["Enums"]["semaforo_tipo"]
          servicio_especifico?: string | null
          siguiente_accion?:
            | Database["public"]["Enums"]["siguiente_accion"]
            | null
          situacion_actual?: string
          stripe_payment_id?: string | null
          telefono?: string
          tipo_reclamacion?:
            | Database["public"]["Enums"]["tipo_reclamacion"]
            | null
          tipo_relacion?: string
          updated_at?: string
          urgencia?: boolean
          urgencia_percibida?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_interinos_profesional_interviniente_fkey"
            columns: ["profesional_interviniente"]
            isOneToOne: false
            referencedRelation: "abogados"
            referencedColumns: ["id"]
          },
        ]
      }
      plantillas_reclamacion: {
        Row: {
          activa: boolean
          contenido_html: string
          creado_por: string | null
          creado_por_email: string | null
          created_at: string
          descripcion: string | null
          id: string
          nombre: string
          tipo: Database["public"]["Enums"]["plantilla_tipo"]
          updated_at: string
          variables_disponibles: Json
        }
        Insert: {
          activa?: boolean
          contenido_html?: string
          creado_por?: string | null
          creado_por_email?: string | null
          created_at?: string
          descripcion?: string | null
          id?: string
          nombre: string
          tipo?: Database["public"]["Enums"]["plantilla_tipo"]
          updated_at?: string
          variables_disponibles?: Json
        }
        Update: {
          activa?: boolean
          contenido_html?: string
          creado_por?: string | null
          creado_por_email?: string | null
          created_at?: string
          descripcion?: string | null
          id?: string
          nombre?: string
          tipo?: Database["public"]["Enums"]["plantilla_tipo"]
          updated_at?: string
          variables_disponibles?: Json
        }
        Relationships: []
      }
      provincia_abogado: {
        Row: {
          abogado_id: string
          created_at: string
          id: string
          provincia: string
          updated_at: string
        }
        Insert: {
          abogado_id: string
          created_at?: string
          id?: string
          provincia: string
          updated_at?: string
        }
        Update: {
          abogado_id?: string
          created_at?: string
          id?: string
          provincia?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "provincia_abogado_abogado_id_fkey"
            columns: ["abogado_id"]
            isOneToOne: false
            referencedRelation: "abogados"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_assigned_lawyer: {
        Args: { _lead_id: string; _user_id: string }
        Returns: boolean
      }
      is_lawyer: { Args: { _user_id: string }; Returns: boolean }
      is_lead_owner: {
        Args: { _lead_id: string; _user_id: string }
        Returns: boolean
      }
      is_perito: { Args: { _user_id: string }; Returns: boolean }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      obtener_directorio_usuarios: {
        Args: never
        Returns: {
          abogado_activo: boolean
          abogado_id: string
          despacho_id: string
          email: string
          nombre: string
          user_id: string
        }[]
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
    }
    Enums: {
      app_role: "lawyer" | "admin" | "client" | "perito"
      area_sector:
        | "sanidad_publica"
        | "educacion_publica"
        | "universidad_publica"
        | "age"
        | "ccaa"
        | "ayuntamiento"
        | "organismo_publico"
        | "otro"
      documento_categoria:
        | "contrato"
        | "nomina"
        | "vida_laboral"
        | "cese"
        | "sentencia"
        | "justificante_pago"
        | "otro"
        | "dni"
        | "apud_acta"
      documento_estado: "pendiente" | "aceptado" | "rechazado"
      documento_generado_formato: "docx" | "pdf" | "html"
      estado_caso:
        | "Nuevo"
        | "En estudio"
        | "Propuesta enviada"
        | "Cliente"
        | "Descartado"
      estado_valoracion: "borrador" | "enviada" | "aceptada" | "rechazada"
      extraccion_estado:
        | "pendiente"
        | "procesando"
        | "completado"
        | "error"
        | "validado"
      metodo_pago: "stripe" | "transferencia" | "bizum" | "efectivo" | "otro"
      perfil_tipo: "laboral" | "funcionario" | "desconocido"
      plantilla_tipo:
        | "demanda"
        | "recurso_alzada"
        | "recurso_reposicion"
        | "papeleta_conciliacion"
        | "reclamacion_previa"
        | "escrito_generico"
        | "otro"
        | "hoja_encargo"
      resultado_contacto:
        | "pendiente"
        | "contactado_interesado"
        | "contactado_no_interesado"
        | "no_contesta"
        | "cita_programada"
        | "en_negociacion"
        | "cerrado_positivo"
        | "cerrado_negativo"
      resultado_viabilidad: "inviable" | "revision" | "viable" | "urgente"
      semaforo_tipo: "rojo" | "ambar" | "verde"
      siguiente_accion:
        | "llamarle"
        | "enviar_propuesta"
        | "esperar_documentacion"
        | "enviar_al_abogado"
        | "derivar_perito"
        | "presentar_reclamacion_administrativa"
        | "preparar_demanda"
        | "archivar"
      tipo_reclamacion:
        | "abuso_temporalidad_funcionario"
        | "abuso_temporalidad_estatutario"
        | "abuso_temporalidad_laboral"
        | "indefinido_no_fijo"
        | "cese_despido_improcedente"
        | "estabilizacion_sin_plaza"
        | "responsabilidad_patrimonial"
        | "otro"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["lawyer", "admin", "client", "perito"],
      area_sector: [
        "sanidad_publica",
        "educacion_publica",
        "universidad_publica",
        "age",
        "ccaa",
        "ayuntamiento",
        "organismo_publico",
        "otro",
      ],
      documento_categoria: [
        "contrato",
        "nomina",
        "vida_laboral",
        "cese",
        "sentencia",
        "justificante_pago",
        "otro",
        "dni",
        "apud_acta",
      ],
      documento_estado: ["pendiente", "aceptado", "rechazado"],
      documento_generado_formato: ["docx", "pdf", "html"],
      estado_caso: [
        "Nuevo",
        "En estudio",
        "Propuesta enviada",
        "Cliente",
        "Descartado",
      ],
      estado_valoracion: ["borrador", "enviada", "aceptada", "rechazada"],
      extraccion_estado: [
        "pendiente",
        "procesando",
        "completado",
        "error",
        "validado",
      ],
      metodo_pago: ["stripe", "transferencia", "bizum", "efectivo", "otro"],
      perfil_tipo: ["laboral", "funcionario", "desconocido"],
      plantilla_tipo: [
        "demanda",
        "recurso_alzada",
        "recurso_reposicion",
        "papeleta_conciliacion",
        "reclamacion_previa",
        "escrito_generico",
        "otro",
        "hoja_encargo",
      ],
      resultado_contacto: [
        "pendiente",
        "contactado_interesado",
        "contactado_no_interesado",
        "no_contesta",
        "cita_programada",
        "en_negociacion",
        "cerrado_positivo",
        "cerrado_negativo",
      ],
      resultado_viabilidad: ["inviable", "revision", "viable", "urgente"],
      semaforo_tipo: ["rojo", "ambar", "verde"],
      siguiente_accion: [
        "llamarle",
        "enviar_propuesta",
        "esperar_documentacion",
        "enviar_al_abogado",
        "derivar_perito",
        "presentar_reclamacion_administrativa",
        "preparar_demanda",
        "archivar",
      ],
      tipo_reclamacion: [
        "abuso_temporalidad_funcionario",
        "abuso_temporalidad_estatutario",
        "abuso_temporalidad_laboral",
        "indefinido_no_fijo",
        "cese_despido_improcedente",
        "estabilizacion_sin_plaza",
        "responsabilidad_patrimonial",
        "otro",
      ],
    },
  },
} as const

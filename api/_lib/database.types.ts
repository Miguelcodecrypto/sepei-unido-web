/**
 * Tipos del esquema REAL de producción, generados con:
 *
 *     npm run types:db        (supabase gen types typescript --linked)
 *
 * No editar a mano: regenerar después de cada migración. Si estos tipos se quedan
 * viejos, mienten — y el compilador deja de proteger. Los usa `getSupabaseAdmin()`,
 * así que cada consulta de api/ se comprueba contra las columnas de verdad.
 *
 * Al introducirlos el 2026-09-14 destaparon que `api/auth.ts` escribía en una columna
 * inexistente (`last_login` en vez de `lastlogin`): el update fallaba en silencio y la
 * fecha de último acceso no se guardaba nunca.
 */
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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      admin_login_attempts: {
        Row: {
          attempt_number: number | null
          attempted_password: string | null
          blocked: boolean | null
          city: string | null
          country: string | null
          created_at: string | null
          id: string
          ip_address: string | null
          success: boolean | null
          user_agent: string | null
        }
        Insert: {
          attempt_number?: number | null
          attempted_password?: string | null
          blocked?: boolean | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          id?: string
          ip_address?: string | null
          success?: boolean | null
          user_agent?: string | null
        }
        Update: {
          attempt_number?: number | null
          attempted_password?: string | null
          blocked?: boolean | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          id?: string
          ip_address?: string | null
          success?: boolean | null
          user_agent?: string | null
        }
        Relationships: []
      }
      announcements: {
        Row: {
          archivo_nombre: string | null
          archivo_tipo: string | null
          archivo_url: string | null
          autor: string
          categoria: string
          contenido: string
          destacado: boolean | null
          es_html: boolean | null
          fecha_creacion: string | null
          fecha_publicacion: string | null
          id: string
          imagen_url: string | null
          publicado: boolean | null
          titulo: string
          vistas: number | null
        }
        Insert: {
          archivo_nombre?: string | null
          archivo_tipo?: string | null
          archivo_url?: string | null
          autor: string
          categoria: string
          contenido: string
          destacado?: boolean | null
          es_html?: boolean | null
          fecha_creacion?: string | null
          fecha_publicacion?: string | null
          id?: string
          imagen_url?: string | null
          publicado?: boolean | null
          titulo: string
          vistas?: number | null
        }
        Update: {
          archivo_nombre?: string | null
          archivo_tipo?: string | null
          archivo_url?: string | null
          autor?: string
          categoria?: string
          contenido?: string
          destacado?: boolean | null
          es_html?: boolean | null
          fecha_creacion?: string | null
          fecha_publicacion?: string | null
          id?: string
          imagen_url?: string | null
          publicado?: boolean | null
          titulo?: string
          vistas?: number | null
        }
        Relationships: []
      }
      announcements_attachments: {
        Row: {
          announcement_id: string | null
          categoria: string
          created_at: string
          id: string
          nombre: string
          tipo: string
          url: string
        }
        Insert: {
          announcement_id?: string | null
          categoria: string
          created_at?: string
          id?: string
          nombre: string
          tipo: string
          url: string
        }
        Update: {
          announcement_id?: string | null
          categoria?: string
          created_at?: string
          id?: string
          nombre?: string
          tipo?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_attachments_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      blocked_ips: {
        Row: {
          blocked_at: string | null
          blocked_until: string | null
          created_by: string | null
          id: string
          ip_address: string
          reason: string | null
        }
        Insert: {
          blocked_at?: string | null
          blocked_until?: string | null
          created_by?: string | null
          id?: string
          ip_address: string
          reason?: string | null
        }
        Update: {
          blocked_at?: string | null
          blocked_until?: string | null
          created_by?: string | null
          id?: string
          ip_address?: string
          reason?: string | null
        }
        Relationships: []
      }
      boe_convocatorias: {
        Row: {
          anio: number
          departamento: string
          dias_desde_publicacion: number | null
          dias_restantes: number | null
          estado_plazo: string | null
          fecha: string
          fecha_iso: string
          id: string
          prioridad: number | null
          tipo: string
          titulo: string
          updated_at: string
          url_htm: string | null
          url_pdf: string | null
        }
        Insert: {
          anio: number
          departamento?: string
          dias_desde_publicacion?: number | null
          dias_restantes?: number | null
          estado_plazo?: string | null
          fecha: string
          fecha_iso: string
          id: string
          prioridad?: number | null
          tipo: string
          titulo: string
          updated_at?: string
          url_htm?: string | null
          url_pdf?: string | null
        }
        Update: {
          anio?: number
          departamento?: string
          dias_desde_publicacion?: number | null
          dias_restantes?: number | null
          estado_plazo?: string | null
          fecha?: string
          fecha_iso?: string
          id?: string
          prioridad?: number | null
          tipo?: string
          titulo?: string
          updated_at?: string
          url_htm?: string | null
          url_pdf?: string | null
        }
        Relationships: []
      }
      boe_sync_log: {
        Row: {
          dias_consultados: number | null
          duracion_ms: number | null
          error: string | null
          finished_at: string | null
          id: number
          started_at: string
          status: string
          total_resultados: number | null
          trigger_source: string
        }
        Insert: {
          dias_consultados?: number | null
          duracion_ms?: number | null
          error?: string | null
          finished_at?: string | null
          id?: never
          started_at: string
          status: string
          total_resultados?: number | null
          trigger_source: string
        }
        Update: {
          dias_consultados?: number | null
          duracion_ms?: number | null
          error?: string | null
          finished_at?: string | null
          id?: never
          started_at?: string
          status?: string
          total_resultados?: number | null
          trigger_source?: string
        }
        Relationships: []
      }
      external_emails: {
        Row: {
          activo: boolean | null
          baja_at: string | null
          created_at: string | null
          descripcion: string | null
          email: string
          id: string
          nombre: string
          unsubscribe_token: string
          updated_at: string | null
        }
        Insert: {
          activo?: boolean | null
          baja_at?: string | null
          created_at?: string | null
          descripcion?: string | null
          email: string
          id?: string
          nombre: string
          unsubscribe_token?: string
          updated_at?: string | null
        }
        Update: {
          activo?: boolean | null
          baja_at?: string | null
          created_at?: string | null
          descripcion?: string | null
          email?: string
          id?: string
          nombre?: string
          unsubscribe_token?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      interinos_bibliografia: {
        Row: {
          categoria: string
          created_at: string
          created_by: string | null
          descripcion: string | null
          id: string
          nombre: string
          tipo: string
          titulo: string
          url: string
        }
        Insert: {
          categoria?: string
          created_at?: string
          created_by?: string | null
          descripcion?: string | null
          id?: string
          nombre: string
          tipo: string
          titulo: string
          url: string
        }
        Update: {
          categoria?: string
          created_at?: string
          created_by?: string | null
          descripcion?: string | null
          id?: string
          nombre?: string
          tipo?: string
          titulo?: string
          url?: string
        }
        Relationships: []
      }
      opciones_votacion: {
        Row: {
          fecha_creacion: string
          id: string
          orden: number
          texto: string
          votacion_id: string
        }
        Insert: {
          fecha_creacion?: string
          id?: string
          orden?: number
          texto: string
          votacion_id: string
        }
        Update: {
          fecha_creacion?: string
          id?: string
          orden?: number
          texto?: string
          votacion_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "opciones_votacion_votacion_id_fkey"
            columns: ["votacion_id"]
            isOneToOne: false
            referencedRelation: "votaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      site_visits: {
        Row: {
          id: string
          page_url: string | null
          referrer: string | null
          session_id: string | null
          user_agent: string | null
          user_id: string | null
          visited_at: string | null
        }
        Insert: {
          id?: string
          page_url?: string | null
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
          visited_at?: string | null
        }
        Update: {
          id?: string
          page_url?: string | null
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
          visited_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "site_visits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      suggestions: {
        Row: {
          apellidos: string
          asunto: string
          categoria: string
          created_at: string | null
          descripcion: string
          email: string
          fecha_registro: string | null
          id: string
          lugar_trabajo: string
          nombre: string
          telefono: string
        }
        Insert: {
          apellidos: string
          asunto: string
          categoria: string
          created_at?: string | null
          descripcion: string
          email: string
          fecha_registro?: string | null
          id?: string
          lugar_trabajo: string
          nombre: string
          telefono: string
        }
        Update: {
          apellidos?: string
          asunto?: string
          categoria?: string
          created_at?: string | null
          descripcion?: string
          email?: string
          fecha_registro?: string | null
          id?: string
          lugar_trabajo?: string
          nombre?: string
          telefono?: string
        }
        Relationships: []
      }
      telegram_link_codes: {
        Row: {
          code: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "telegram_link_codes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      telegram_notification_log: {
        Row: {
          chat_id: string
          created_at: string
          error_message: string | null
          id: string
          notification_type: string
          reference_id: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          chat_id: string
          created_at?: string
          error_message?: string | null
          id?: string
          notification_type: string
          reference_id?: string | null
          status: string
          user_id?: string | null
        }
        Update: {
          chat_id?: string
          created_at?: string
          error_message?: string | null
          id?: string
          notification_type?: string
          reference_id?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "telegram_notification_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_interactions: {
        Row: {
          created_at: string | null
          duration_seconds: number | null
          id: string
          interaction_data: Json | null
          interaction_type: string
          item_id: string | null
          section: string
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          duration_seconds?: number | null
          id?: string
          interaction_data?: Json | null
          interaction_type: string
          item_id?: string | null
          section: string
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          duration_seconds?: number | null
          id?: string
          interaction_data?: Json | null
          interaction_type?: string
          item_id?: string | null
          section?: string
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_interactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_sessions: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          ip_address: string | null
          is_active: boolean | null
          last_activity: string | null
          session_token: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          last_activity?: string | null
          session_token: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          last_activity?: string | null
          session_token?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          apellidos: string | null
          autorizado_votar: boolean | null
          certificado_fecha_validacion: string | null
          certificado_nif: string | null
          certificado_thumbprint: string | null
          certificado_valido: boolean | null
          created_at: string | null
          dni: string | null
          email: string
          email_notifications: boolean | null
          fecha_aceptacion_terminos: string | null
          fecha_registro: string | null
          id: string
          lastlogin: string | null
          nombre: string
          parque_sepei: string | null
          password: string | null
          password_changed_at: string | null
          registration_ip: string | null
          requires_password_change: boolean | null
          telefono: string | null
          telegram_chat_id: string | null
          telegram_linked_at: string | null
          telegram_username: string | null
          terminos_aceptados: boolean | null
          updated_at: string | null
          verification_token: string | null
          verification_token_expires_at: string | null
          verified: boolean | null
          version_terminos: string | null
        }
        Insert: {
          apellidos?: string | null
          autorizado_votar?: boolean | null
          certificado_fecha_validacion?: string | null
          certificado_nif?: string | null
          certificado_thumbprint?: string | null
          certificado_valido?: boolean | null
          created_at?: string | null
          dni?: string | null
          email: string
          email_notifications?: boolean | null
          fecha_aceptacion_terminos?: string | null
          fecha_registro?: string | null
          id?: string
          lastlogin?: string | null
          nombre: string
          parque_sepei?: string | null
          password?: string | null
          password_changed_at?: string | null
          registration_ip?: string | null
          requires_password_change?: boolean | null
          telefono?: string | null
          telegram_chat_id?: string | null
          telegram_linked_at?: string | null
          telegram_username?: string | null
          terminos_aceptados?: boolean | null
          updated_at?: string | null
          verification_token?: string | null
          verification_token_expires_at?: string | null
          verified?: boolean | null
          version_terminos?: string | null
        }
        Update: {
          apellidos?: string | null
          autorizado_votar?: boolean | null
          certificado_fecha_validacion?: string | null
          certificado_nif?: string | null
          certificado_thumbprint?: string | null
          certificado_valido?: boolean | null
          created_at?: string | null
          dni?: string | null
          email?: string
          email_notifications?: boolean | null
          fecha_aceptacion_terminos?: string | null
          fecha_registro?: string | null
          id?: string
          lastlogin?: string | null
          nombre?: string
          parque_sepei?: string | null
          password?: string | null
          password_changed_at?: string | null
          registration_ip?: string | null
          requires_password_change?: boolean | null
          telefono?: string | null
          telegram_chat_id?: string | null
          telegram_linked_at?: string | null
          telegram_username?: string | null
          terminos_aceptados?: boolean | null
          updated_at?: string | null
          verification_token?: string | null
          verification_token_expires_at?: string | null
          verified?: boolean | null
          version_terminos?: string | null
        }
        Relationships: []
      }
      votaciones: {
        Row: {
          creado_por: string | null
          descripcion: string | null
          fecha_creacion: string
          fecha_fin: string
          fecha_inicio: string
          id: string
          multiple_respuestas: boolean
          publicado: boolean
          resultados_publicos: boolean
          tipo: string
          titulo: string
        }
        Insert: {
          creado_por?: string | null
          descripcion?: string | null
          fecha_creacion?: string
          fecha_fin: string
          fecha_inicio?: string
          id?: string
          multiple_respuestas?: boolean
          publicado?: boolean
          resultados_publicos?: boolean
          tipo: string
          titulo: string
        }
        Update: {
          creado_por?: string | null
          descripcion?: string | null
          fecha_creacion?: string
          fecha_fin?: string
          fecha_inicio?: string
          id?: string
          multiple_respuestas?: boolean
          publicado?: boolean
          resultados_publicos?: boolean
          tipo?: string
          titulo?: string
        }
        Relationships: []
      }
      voto_participaciones: {
        Row: {
          fecha_voto: string
          id: string
          user_id: string
          votacion_id: string
        }
        Insert: {
          fecha_voto?: string
          id?: string
          user_id: string
          votacion_id: string
        }
        Update: {
          fecha_voto?: string
          id?: string
          user_id?: string
          votacion_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "voto_participaciones_votacion_id_fkey"
            columns: ["votacion_id"]
            isOneToOne: false
            referencedRelation: "votaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      votos: {
        Row: {
          fecha_voto: string
          id: string
          opcion_id: string
          participacion_id: string
          votacion_id: string
        }
        Insert: {
          fecha_voto?: string
          id?: string
          opcion_id: string
          participacion_id: string
          votacion_id: string
        }
        Update: {
          fecha_voto?: string
          id?: string
          opcion_id?: string
          participacion_id?: string
          votacion_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "votos_opcion_id_fkey"
            columns: ["opcion_id"]
            isOneToOne: false
            referencedRelation: "opciones_votacion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votos_participacion_id_fkey"
            columns: ["participacion_id"]
            isOneToOne: false
            referencedRelation: "voto_participaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votos_votacion_id_fkey"
            columns: ["votacion_id"]
            isOneToOne: false
            referencedRelation: "votaciones"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      admin_security_dashboard: {
        Row: {
          exitosos: number | null
          fallidos: number | null
          hora: string | null
          ips_unicas: number | null
          total_intentos: number | null
        }
        Relationships: []
      }
      analytics_summary: {
        Row: {
          anonymous_visits: number | null
          authenticated_visits: number | null
          unique_sessions: number | null
          unique_users: number | null
          visit_date: string | null
          visits: number | null
        }
        Relationships: []
      }
      section_interactions: {
        Row: {
          avg_duration_seconds: number | null
          interaction_count: number | null
          interaction_date: string | null
          interaction_type: string | null
          section: string | null
          unique_sessions: number | null
          unique_users: number | null
        }
        Relationships: []
      }
      telegram_stats: {
        Row: {
          porcentaje_vinculados: number | null
          total_usuarios: number | null
          usuarios_vinculados: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      cleanup_expired_sessions: { Args: never; Returns: undefined }
      cleanup_expired_telegram_codes: { Args: never; Returns: undefined }
      count_failed_attempts: {
        Args: { check_ip: string; hours?: number }
        Returns: number
      }
      get_security_stats: { Args: never; Returns: Json }
      get_telegram_recipients: {
        Args: { p_exclude_user_id?: string }
        Returns: {
          apellidos: string
          id: string
          nombre: string
          telegram_chat_id: string
        }[]
      }
      get_top_active_users: {
        Args: { limit_count?: number }
        Returns: {
          last_interaction: string
          total_interactions: number
          user_email: string
          user_id: string
          user_name: string
        }[]
      }
      increment_announcement_views: {
        Args: { announcement_id: string }
        Returns: undefined
      }
      is_ip_blocked: { Args: { check_ip: string }; Returns: boolean }
      obtener_resultados_votacion: {
        Args: { votacion_uuid: string }
        Returns: {
          opcion_id: string
          porcentaje: number
          texto: string
          total_votos: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

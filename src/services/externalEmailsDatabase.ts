/**
 * Servicio para gestionar emails externos
 * Emails que recibirán notificaciones sin ser usuarios registrados
 */

import { supabase } from './supabaseClient';

export interface ExternalEmail {
  id: string;
  email: string;
  nombre: string;
  descripcion?: string;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Obtener todos los emails externos
 */
export async function getAllExternalEmails(): Promise<ExternalEmail[]> {
  try {
    const { data, error } = await supabase
      .from('external_emails')
      .select('*')
      .order('nombre', { ascending: true });

    if (error) {
      console.error('Error obteniendo emails externos:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error en getAllExternalEmails:', error);
    return [];
  }
}

/**
 * Obtener solo emails externos activos
 */
export async function getActiveExternalEmails(): Promise<ExternalEmail[]> {
  try {
    const { data, error } = await supabase
      .from('external_emails')
      .select('*')
      .eq('activo', true)
      .order('nombre', { ascending: true });

    if (error) {
      console.error('Error obteniendo emails activos:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error en getActiveExternalEmails:', error);
    return [];
  }
}

/**
 * Crear nuevo email externo
 */
export async function createExternalEmail(
  email: string,
  nombre: string,
  descripcion?: string
): Promise<boolean> {
  try {
    // Validar formato email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.error('Formato de email inválido');
      return false;
    }

    const { error } = await supabase
      .from('external_emails')
      .insert([{
        email: email.toLowerCase().trim(),
        nombre: nombre.trim(),
        descripcion: descripcion?.trim() || null,
        activo: true
      }]);

    if (error) {
      if (error.code === '23505') { // unique_violation
        console.error('Este email ya existe');
      } else {
        console.error('Error creando email externo:', error);
      }
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error en createExternalEmail:', error);
    return false;
  }
}

/**
 * Actualizar email externo
 */
export async function updateExternalEmail(
  id: string,
  updates: Partial<Omit<ExternalEmail, 'id' | 'created_at' | 'updated_at'>>
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('external_emails')
      .update(updates)
      .eq('id', id);

    if (error) {
      console.error('Error actualizando email externo:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error en updateExternalEmail:', error);
    return false;
  }
}

/**
 * Eliminar email externo
 */
export async function deleteExternalEmail(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('external_emails')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error eliminando email externo:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error en deleteExternalEmail:', error);
    return false;
  }
}

/**
 * Activar/desactivar email externo
 */
export async function toggleExternalEmailStatus(id: string, activo: boolean): Promise<boolean> {
  return updateExternalEmail(id, { activo });
}

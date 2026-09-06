import { supabase } from '../lib/supabase';
import { getCurrentUser } from './sessionService';
import { getClientIP } from '../utils/network';
import { adminFetch } from './adminFetch';

/**
 * Servicio de Analytics para rastrear visitas e interacciones
 */

// Generar ID de sesión único (almacenar en sessionStorage)
function getOrCreateSessionId(): string {
  let sessionId = sessionStorage.getItem('analytics_session_id');
  if (!sessionId) {
    sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    sessionStorage.setItem('analytics_session_id', sessionId);
  }
  return sessionId;
}

/**
 * Registrar visita a la página
 */
export async function trackPageVisit(pageUrl?: string): Promise<void> {
  try {
    const sessionId = getOrCreateSessionId();
    const currentUser = await getCurrentUser();
    const ip = await getClientIP();
    
    console.log('📊 [ANALYTICS] Usuario actual:', currentUser ? `${currentUser.nombre} (ID: ${currentUser.id})` : 'No autenticado');
    
    const visitData = {
      session_id: sessionId,
      user_id: currentUser?.id || null,
      visited_at: new Date().toISOString(),
      ip_address: ip,
      user_agent: navigator.userAgent,
      referrer: document.referrer || null,
      page_url: pageUrl || window.location.pathname
    };

    const { error } = await supabase
      .from('site_visits')
      .insert([visitData]);

    if (error) {
      console.error('❌ [ANALYTICS] Error al insertar visita:', error);
    } else {
      console.log('✅ [ANALYTICS] Visita registrada:', {
        page: pageUrl || window.location.pathname,
        user_id: currentUser?.id || 'anónimo',
        session: sessionId
      });
    }
  } catch (error) {
    console.error('❌ [ANALYTICS] Error al registrar visita:', error);
  }
}

/**
 * Registrar interacción con una sección específica
 */
export async function trackInteraction(
  section: 'announcements' | 'voting' | 'suggestions' | 'profile' | 'admin' | 'interinos',
  interactionType: string,
  itemId?: string,
  additionalData?: Record<string, any>,
  durationSeconds?: number
): Promise<void> {
  try {
    const sessionId = getOrCreateSessionId();
    const currentUser = await getCurrentUser();
    const ip = await getClientIP();
    
    const interactionData = {
      session_id: sessionId,
      user_id: currentUser?.id || null,
      interaction_type: interactionType,
      section: section,
      item_id: itemId || null,
      interaction_data: additionalData || null,
      created_at: new Date().toISOString(),
      ip_address: ip,
      duration_seconds: durationSeconds || null
    };

    const { error } = await supabase
      .from('user_interactions')
      .insert([interactionData]);

    if (error) {
      console.error('❌ [ANALYTICS] Error al registrar interacción:', error);
    } else {
      console.log('✅ [ANALYTICS] Interacción registrada:', {
        section,
        type: interactionType,
        user_id: currentUser?.id || 'anónimo'
      });
    }
  } catch (error) {
    console.error('❌ [ANALYTICS] Error al registrar interacción:', error);
  }
}

/**
 * Obtener estadísticas generales para el dashboard
 */
export async function getAnalyticsSummary(days: number = 30): Promise<{
  totalVisits: number;
  uniqueUsers: number;
  authenticatedVisits: number;
  anonymousVisits: number;
  uniqueSessions: number;
  pageViews: number;
  visitsByDay: Array<{ date: string; visits: number }>;
}> {
  try {
    const { summary } = await adminFetch(`/api/admin?resource=analytics&detail=summary&days=${days}`);
    return summary;
  } catch (error) {
    console.error('❌ [ANALYTICS] Error al obtener resumen:', error);
    return {
      totalVisits: 0,
      uniqueUsers: 0,
      authenticatedVisits: 0,
      anonymousVisits: 0,
      uniqueSessions: 0,
      pageViews: 0,
      visitsByDay: []
    };
  }
}

/**
 * Obtener interacciones por sección
 */
export async function getSectionInteractions(days: number = 30): Promise<{
  announcements: number;
  voting: number;
  suggestions: number;
  admin: number;
  interinos: number;
}> {
  try {
    const { sections } = await adminFetch(`/api/admin?resource=analytics&detail=sections&days=${days}`);
    return sections;
  } catch (error) {
    console.error('❌ [ANALYTICS] Error al obtener interacciones por sección:', error);
    return {
      announcements: 0,
      voting: 0,
      suggestions: 0,
      admin: 0,
      interinos: 0
    };
  }
}

/**
 * Obtener usuarios más activos
 */
export async function getTopActiveUsers(limit: number = 10): Promise<Array<{
  user_id: string;
  user_name: string;
  user_email: string;
  total_interactions: number;
  last_interaction: string;
}>> {
  try {
    const { users } = await adminFetch(`/api/admin?resource=analytics&detail=top_users&limit=${limit}`);
    return users || [];
  } catch (error) {
    console.error('❌ [ANALYTICS] Error al obtener usuarios activos:', error);
    return [];
  }
}

/**
 * Crear rastreador de tiempo en sección (NO es un hook de React)
 * Uso: const cleanup = createSectionTimeTracker('section'); return cleanup;
 */
export function createSectionTimeTracker(section: 'announcements' | 'voting' | 'suggestions' | 'admin' | 'interinos') {
  const startTime = Date.now();

  const trackTime = () => {
    const durationSeconds = Math.floor((Date.now() - startTime) / 1000);
    if (durationSeconds > 2) { // Solo registrar si estuvo más de 2 segundos
      trackInteraction(section, `view_${section}`, undefined, undefined, durationSeconds);
    }
  };

  // Retornar función de limpieza
  return trackTime;
}

// Alias para compatibilidad (deprecado, usar createSectionTimeTracker)
export const useTrackSectionTime = createSectionTimeTracker;

/**
 * Obtener métricas específicas de la sección Interinos
 */
export async function getInterinosAnalytics(days: number = 30): Promise<{
  totalVisits: number;
  uniqueUsers: number;
  totalInteractions: number;
  interactionsByType: Record<string, number>;
  averageTimeSeconds: number;
  topUsers: Array<{ user_id: string; user_name: string; interactions: number }>;
  visitsByDay: Array<{ date: string; visits: number }>;
  documentDownloads: number;
  linkClicks: number;
  courseViews: number;
}> {
  try {
    const { interinos } = await adminFetch(`/api/admin?resource=analytics&detail=interinos&days=${days}`);
    return interinos;
  } catch (error) {
    console.error('❌ [ANALYTICS] Error al obtener métricas de Interinos:', error);
    return {
      totalVisits: 0,
      uniqueUsers: 0,
      totalInteractions: 0,
      interactionsByType: {},
      averageTimeSeconds: 0,
      topUsers: [],
      visitsByDay: [],
      documentDownloads: 0,
      linkClicks: 0,
      courseViews: 0
    };
  }
}

/**
 * Obtener estadísticas de contenido de Interinos
 */
export async function getInterinosContentStats(): Promise<{
  totalDocuments: number;
  totalCourses: number;
  totalLinks: number;
  totalNews: number;
  totalOposiciones: number;
  documentsByCategory: Record<string, number>;
}> {
  try {
    const { stats } = await adminFetch('/api/admin?resource=analytics&detail=interinos_content');
    return stats;
  } catch (error) {
    console.error('❌ [ANALYTICS] Error al obtener estadísticas de contenido:', error);
    return {
      totalDocuments: 0,
      totalCourses: 0,
      totalLinks: 0,
      totalNews: 0,
      totalOposiciones: 0,
      documentsByCategory: {}
    };
  }
}

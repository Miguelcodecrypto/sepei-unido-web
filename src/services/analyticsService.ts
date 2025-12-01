import { supabase } from '../lib/supabase';
import { getCurrentUser } from './sessionService';

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

// Obtener IP del cliente
async function getClientIP(): Promise<string> {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch {
    return 'unknown';
  }
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
  section: 'announcements' | 'voting' | 'suggestions' | 'profile' | 'admin',
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
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Total de visitas
    const { count: totalVisits } = await supabase
      .from('site_visits')
      .select('*', { count: 'exact', head: true })
      .gte('visited_at', startDate.toISOString());

    // Usuarios únicos autenticados
    const { data: uniqueUsersData } = await supabase
      .from('site_visits')
      .select('user_id')
      .not('user_id', 'is', null)
      .gte('visited_at', startDate.toISOString());
    
    const uniqueUsers = new Set(uniqueUsersData?.map(v => v.user_id) || []).size;

    // Sesiones únicas anónimas
    const { data: anonymousSessionsData } = await supabase
      .from('site_visits')
      .select('session_id')
      .is('user_id', null)
      .gte('visited_at', startDate.toISOString());
    
    const uniqueSessions = new Set(anonymousSessionsData?.map(v => v.session_id) || []).size;

    // Visitas autenticadas
    const { count: authenticatedVisits } = await supabase
      .from('site_visits')
      .select('*', { count: 'exact', head: true })
      .not('user_id', 'is', null)
      .gte('visited_at', startDate.toISOString());

    // Visitas anónimas
    const { count: anonymousVisits } = await supabase
      .from('site_visits')
      .select('*', { count: 'exact', head: true })
      .is('user_id', null)
      .gte('visited_at', startDate.toISOString());

    // Visitas por día (usando la vista directamente)
    const { data: visitsByDay } = await supabase
      .from('analytics_summary')
      .select('*')
      .gte('visit_date', startDate.toISOString().split('T')[0])
      .order('visit_date', { ascending: false })
      .limit(days);

    return {
      totalVisits: totalVisits || 0,
      uniqueUsers,
      authenticatedVisits: authenticatedVisits || 0,
      anonymousVisits: anonymousVisits || 0,
      uniqueSessions,
      pageViews: totalVisits || 0,
      visitsByDay: visitsByDay || []
    };
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
}> {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: interactions } = await supabase
      .from('user_interactions')
      .select('section')
      .gte('created_at', startDate.toISOString());

    const counts = {
      announcements: 0,
      voting: 0,
      suggestions: 0,
      admin: 0
    };

    interactions?.forEach(interaction => {
      if (interaction.section in counts) {
        counts[interaction.section as keyof typeof counts]++;
      }
    });

    return counts;
  } catch (error) {
    console.error('❌ [ANALYTICS] Error al obtener interacciones por sección:', error);
    return {
      announcements: 0,
      voting: 0,
      suggestions: 0,
      admin: 0
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
    const { data, error } = await supabase
      .rpc('get_top_active_users', { limit_count: limit })
      .returns<Array<{
        user_id: string;
        user_name: string;
        user_email: string;
        total_interactions: number;
        last_interaction: string;
      }>>();

    if (error) {
      console.error('❌ [ANALYTICS] Error al obtener usuarios activos:', error);
      return [];
    }

    return (data as Array<{
      user_id: string;
      user_name: string;
      user_email: string;
      total_interactions: number;
      last_interaction: string;
    }>) || [];
  } catch (error) {
    console.error('❌ [ANALYTICS] Error al obtener usuarios activos:', error);
    return [];
  }
}

/**
 * Hook para rastrear tiempo en sección (usar en componentes)
 */
export function useTrackSectionTime(section: 'announcements' | 'voting' | 'suggestions' | 'admin') {
  let startTime = Date.now();

  const trackTime = () => {
    const durationSeconds = Math.floor((Date.now() - startTime) / 1000);
    if (durationSeconds > 2) { // Solo registrar si estuvo más de 2 segundos
      trackInteraction(section, `view_${section}`, undefined, undefined, durationSeconds);
    }
  };

  // Retornar función de limpieza
  return trackTime;
}

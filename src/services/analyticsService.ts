import { supabase } from '../lib/supabase';
import { getCurrentUser } from './sessionService';
import { getClientIP } from '../utils/network';
import { getAllUsers } from './adminUsersService';

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
      .select('visit_date, visits')
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
      visitsByDay: (visitsByDay || []).map(day => ({
        date: day.visit_date,
        visits: day.visits
      }))
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
  interinos: number;
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
      admin: 0,
      interinos: 0
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
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Interacciones de Interinos
    const { data: interactions } = await supabase
      .from('user_interactions')
      .select('*')
      .eq('section', 'interinos')
      .gte('created_at', startDate.toISOString());

    const totalInteractions = interactions?.length || 0;

    // Usuarios únicos
    const uniqueUserIds = new Set(interactions?.filter(i => i.user_id).map(i => i.user_id) || []);
    const uniqueUsers = uniqueUserIds.size;

    // Interacciones por tipo
    const interactionsByType: Record<string, number> = {};
    interactions?.forEach(i => {
      interactionsByType[i.interaction_type] = (interactionsByType[i.interaction_type] || 0) + 1;
    });

    // Tiempo promedio
    const timesWithDuration = interactions?.filter(i => i.duration_seconds) || [];
    const averageTimeSeconds = timesWithDuration.length > 0
      ? Math.round(timesWithDuration.reduce((acc, i) => acc + (i.duration_seconds || 0), 0) / timesWithDuration.length)
      : 0;

    // Contadores específicos
    const documentDownloads = interactionsByType['download_document'] || interactionsByType['view_bibliography'] || 0;
    const linkClicks = interactionsByType['click_link'] || interactionsByType['view_link'] || 0;
    const courseViews = interactionsByType['view_course'] || interactionsByType['click_course'] || 0;

    // Top usuarios (por interacciones en Interinos)
    const userInteractionCount: Record<string, number> = {};
    interactions?.filter(i => i.user_id).forEach(i => {
      userInteractionCount[i.user_id] = (userInteractionCount[i.user_id] || 0) + 1;
    });

    // Obtener nombres de usuarios
    const userIds = Object.keys(userInteractionCount);
    let topUsers: Array<{ user_id: string; user_name: string; interactions: number }> = [];
    
    if (userIds.length > 0) {
      const allUsers = await getAllUsers();
      const usersData = allUsers.filter((u) => userIds.includes(u.id));

      topUsers = Object.entries(userInteractionCount)
        .map(([userId, count]) => {
          const user = usersData?.find(u => u.id === userId);
          return {
            user_id: userId,
            user_name: user ? `${user.nombre} ${user.apellidos || ''}`.trim() : 'Usuario',
            interactions: count
          };
        })
        .sort((a, b) => b.interactions - a.interactions)
        .slice(0, 10);
    }

    // Visitas por día a la sección
    const visitsByDayMap: Record<string, number> = {};
    interactions?.forEach(i => {
      const date = new Date(i.created_at).toISOString().split('T')[0];
      visitsByDayMap[date] = (visitsByDayMap[date] || 0) + 1;
    });

    const visitsByDay = Object.entries(visitsByDayMap)
      .map(([date, visits]) => ({ date, visits }))
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, days);

    // Total de visitas (interacciones de tipo view)
    const totalVisits = interactionsByType['view_interinos'] || interactionsByType['enter_section'] || totalInteractions;

    return {
      totalVisits,
      uniqueUsers,
      totalInteractions,
      interactionsByType,
      averageTimeSeconds,
      topUsers,
      visitsByDay,
      documentDownloads,
      linkClicks,
      courseViews
    };
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
    const { data: content } = await supabase
      .from('interinos_bibliografia')
      .select('categoria, activo')
      .eq('activo', true);

    const totalDocuments = content?.filter(c => c.categoria === 'formacion_bibliografia').length || 0;
    const totalCourses = content?.filter(c => c.categoria === 'formacion_curso').length || 0;
    const totalLinks = content?.filter(c => c.categoria === 'formacion_enlace').length || 0;
    const totalNews = content?.filter(c => c.categoria === 'noticias_destacadas').length || 0;
    const totalOposiciones = content?.filter(c => c.categoria === 'oposiciones').length || 0;

    const documentsByCategory: Record<string, number> = {};
    content?.forEach(c => {
      documentsByCategory[c.categoria] = (documentsByCategory[c.categoria] || 0) + 1;
    });

    return {
      totalDocuments,
      totalCourses,
      totalLinks,
      totalNews,
      totalOposiciones,
      documentsByCategory
    };
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

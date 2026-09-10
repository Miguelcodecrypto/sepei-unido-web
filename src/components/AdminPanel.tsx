import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { useNotifications } from './ui/NotificationProvider';
import { Users, Download, Trash2, Eye, EyeOff, LogOut, Clock, Lightbulb, Megaphone, BarChart3, CheckCircle, XCircle, Key, TrendingUp, Award, Mail, BookOpen, AlertTriangle, UserX, Shield, Flame, MessageCircle, MapPin } from 'lucide-react';
import { getAllUsers, deleteUser, exportUsersToCSV, toggleVotingAuthorization, resetTempPassword } from '../services/adminUsersService';
import { getAllSuggestions, deleteSuggestion, clearAllSuggestions, exportSuggestionsToCSV } from '../services/suggestionDatabase';
import { logout, getSessionTimeRemaining } from '../services/authService';
import { trackInteraction, createSectionTimeTracker } from '../services/analyticsService';
import { getEstadoPlantilla, EstadoPlantilla } from '../data/plantillaOficialSEPEI';
import { AdminShell, ShellSection } from './admin/AdminShell';
import { UsersSection } from './admin/UsersSection';
import { SuggestionsSection } from './admin/SuggestionsSection';
import { User, Suggestion } from './admin/types';

// Lazy load componentes pesados del admin
const AnnouncementsManager = lazy(() => import('./AnnouncementsManager'));
const VotingManager = lazy(() => import('./VotingManager'));
const AnalyticsDashboard = lazy(() => import('./AnalyticsDashboard'));
const VotingResultsPanel = lazy(() => import('./VotingResultsPanel'));
const ExternalEmailsManager = lazy(() => import('./ExternalEmailsManager').then(m => ({ default: m.ExternalEmailsManager })));
const InterinosManager = lazy(() => import('./InterinosManager'));
const InterinosAnalyticsDashboard = lazy(() => import('./InterinosAnalyticsDashboard'));
const SecurityPanel = lazy(() => import('./SecurityPanel'));
const BOEConvocatoriasAdmin = lazy(() => import('./BOEConvocatoriasAdmin'));

// Loading spinner para los componentes lazy
const TabLoadingSpinner = () => (
  <div className="flex items-center justify-center py-12">
    <div className="w-8 h-8 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin"></div>
  </div>
);

interface AdminPanelProps {
  onLogout: () => void;
}

type AdminTab = 'users' | 'suggestions' | 'announcements' | 'voting' | 'analytics' | 'results' | 'external-emails' | 'interinos' | 'security' | 'convocatorias';

function SuggestionDetailsPanel({ suggestion }: { suggestion: Suggestion }) {
  return (
    <div className="space-y-4">
      <div className="border-t border-slate-700 pt-4">
        <h4 className="text-white font-semibold mb-2">Descripción Completa</h4>
        <p className="text-gray-300 whitespace-pre-wrap leading-relaxed">{suggestion.descripcion}</p>
      </div>
      <div className="grid md:grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-gray-400">Email: </span>
          <span className="text-white">{suggestion.email}</span>
        </div>
        <div>
          <span className="text-gray-400">Teléfono: </span>
          <span className="text-white">{suggestion.telefono}</span>
        </div>
        <div>
          <span className="text-gray-400">Fecha Registro: </span>
          <span className="text-white">
            {new Date(suggestion.fechaRegistro).toLocaleDateString('es-ES')} {new Date(suggestion.fechaRegistro).toLocaleTimeString('es-ES')}
          </span>
        </div>
        <div>
          <span className="text-gray-400">Lugar de Trabajo: </span>
          <span className="text-white">{suggestion.lugarTrabajo}</span>
        </div>
      </div>
    </div>
  );
}

export default function AdminPanel({ onLogout }: AdminPanelProps) {
  const { notify, confirm, alert } = useNotifications();
  const [activeTab, setActiveTab] = useState<AdminTab>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalSuggestions, setTotalSuggestions] = useState(0);
  const [sessionTime, setSessionTime] = useState(0);
  const [filtroPlantilla, setFiltroPlantilla] = useState<'todos' | EstadoPlantilla>('todos');

  // Calcular estados de plantilla para cada usuario
  const usuariosConEstado = useMemo(() => {
    return users.map(user => {
      // El parque va como tercer argumento: sin él nunca se comparaba el destino, así que
      // `cambios_detectados` no podía darse y el filtro "Con cambios" marcaba siempre 0.
      // Si el usuario no ha declarado parque, se pasa undefined y no se compara: no tener
      // el dato no es una discrepancia con la plantilla.
      const estadoInfo = getEstadoPlantilla(user.nombre, user.apellidos, user.parque_sepei || undefined);
      return {
        ...user,
        estadoPlantilla: estadoInfo.estado,
        detallesPlantilla: estadoInfo.detalles,
        diferenciasPlantilla: estadoInfo.diferencias
      };
    });
  }, [users]);

  // Filtrar usuarios según el filtro seleccionado
  const usuariosFiltrados = useMemo(() => {
    if (filtroPlantilla === 'todos') return usuariosConEstado;
    return usuariosConEstado.filter(u => u.estadoPlantilla === filtroPlantilla);
  }, [usuariosConEstado, filtroPlantilla]);

  // Contar usuarios por estado
  const conteoEstados = useMemo(() => {
    const conteo: Record<EstadoPlantilla, number> = { en_plantilla: 0, cambios_detectados: 0, no_en_plantilla: 0 };
    usuariosConEstado.forEach(u => {
      if (u.estadoPlantilla) {
        conteo[u.estadoPlantilla]++;
      }
    });
    return conteo;
  }, [usuariosConEstado]);

  // Contar usuarios con Telegram vinculado
  const usuariosConTelegram = useMemo(() => {
    return users.filter(u => u.telegram_chat_id).length;
  }, [users]);

  useEffect(() => {
    loadUsers();
    loadSuggestions();
    
    // Rastrear acceso al panel de administrador
    trackInteraction('admin', 'view_admin_panel');
    
    // Iniciar seguimiento de tiempo en la sección
    const cleanup = createSectionTimeTracker('admin');
    
    // Actualizar tiempo de sesión cada minuto
    const interval = setInterval(() => {
      setSessionTime(getSessionTimeRemaining());
    }, 60000);
    
    // Mostrar tiempo inicial
    setSessionTime(getSessionTimeRemaining());
    
    return () => {
      clearInterval(interval);
      cleanup();
    };
  }, []);

  const loadUsers = async () => {
    console.log('📥 Cargando usuarios desde Supabase...');
    const data = await getAllUsers();
    console.log('👥 Usuarios obtenidos:', data.length);
    
    // Mapear datos de Supabase (snake_case) a formato del componente
    const mappedData = data.map((user: any) => {
      console.log(`Usuario ${user.nombre}: autorizado_votar =`, user.autorizado_votar);
      return {
        id: user.id,
        nombre: user.nombre,
        apellidos: user.apellidos,
        dni: user.dni,
        email: user.email,
        telefono: user.telefono,
        parque_sepei: user.parque_sepei,
        fecha_registro: user.fecha_registro,
        terminos_aceptados: user.terminos_aceptados,
        fecha_aceptacion_terminos: user.fecha_aceptacion_terminos,
        version_terminos: user.version_terminos,
        certificado_nif: user.certificado_nif,
        certificado_thumbprint: user.certificado_thumbprint,
        certificado_fecha_validacion: user.certificado_fecha_validacion,
        certificado_valido: user.certificado_valido,
        autorizado_votar: user.autorizado_votar,
        telegram_chat_id: user.telegram_chat_id,
        telegram_username: user.telegram_username,
        telegram_linked_at: user.telegram_linked_at,
      };
    });
    
    console.log('✅ Usuarios mapeados, actualizando estado...');
    setUsers(mappedData);
    setTotalUsers(mappedData.length);
    console.log('✅ Estado actualizado');
  };

  const loadSuggestions = async () => {
    const data = await getAllSuggestions();
    // Mapear datos de Supabase (snake_case) a formato del componente (camelCase)
    const mappedData = data.map(suggestion => ({
      id: suggestion.id,
      nombre: suggestion.nombre,
      apellidos: suggestion.apellidos,
      email: suggestion.email,
      telefono: suggestion.telefono,
      categoria: suggestion.categoria,
      lugarTrabajo: suggestion.lugar_trabajo,
      asunto: suggestion.asunto,
      descripcion: suggestion.descripcion,
      fechaRegistro: suggestion.fecha_registro,
    }));
    setSuggestions(mappedData);
    setTotalSuggestions(mappedData.length);
  };

  const handleDeleteUser = async (id: string, nombre: string) => {
    const confirmado = await confirm({
      title: 'Eliminar usuario',
      message: `Se eliminará la cuenta de ${nombre} y perderá el acceso. Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar',
      variant: 'danger',
    });
    if (!confirmado) return;

    await deleteUser(id);
    loadUsers();
    notify.success(`${nombre} eliminado`);
  };

  const handleDeleteSuggestion = async (id: string, asunto: string) => {
    const confirmado = await confirm({
      title: 'Eliminar sugerencia',
      message: `Se eliminará "${asunto}". Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar',
      variant: 'danger',
    });
    if (!confirmado) return;

    await deleteSuggestion(id);
    loadSuggestions();
    notify.success('Sugerencia eliminada');
  };

  const handleLogout = () => {
    logout();
    onLogout();
  };

  const handleExport = async () => {
    const exportado = await exportUsersToCSV();
    if (!exportado) notify.info('No hay usuarios para exportar');
  };

  const handleClearSuggestions = async () => {
    const confirmado = await confirm({
      title: 'Eliminar todas las sugerencias',
      message: `Se eliminarán las ${totalSuggestions} sugerencias recibidas, sin excepción. Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar todas',
      variant: 'danger',
    });
    if (!confirmado) return;

    await clearAllSuggestions();
    loadSuggestions();
    notify.success('Sugerencias eliminadas');
  };

  const handleExportSuggestions = async () => {
    const exportado = await exportSuggestionsToCSV();
    if (!exportado) notify.info('No hay sugerencias para exportar');
  };

  const handleToggleVotingAuth = async (userId: string, currentStatus: boolean, userName: string) => {
    const action = currentStatus ? 'desautorizar' : 'autorizar';
    const confirmado = await confirm({
      title: currentStatus ? 'Retirar autorización de voto' : 'Autorizar para votar',
      message: currentStatus
        ? `${userName} dejará de poder votar en las votaciones en curso.`
        : `${userName} podrá votar en las votaciones en curso.`,
      confirmLabel: currentStatus ? 'Retirar' : 'Autorizar',
    });
    if (!confirmado) return;

    const success = await toggleVotingAuthorization(userId, !currentStatus);

    if (success) {
      await loadUsers(); // Recargar lista de usuarios
      notify.success(`${userName} ${!currentStatus ? 'autorizado' : 'desautorizado'} correctamente`);
    } else {
      console.error('Error al actualizar autorización de voto');
      notify.error(`No se ha podido ${action} a ${userName}.`);
    }
  };

  const handleResetTempPassword = async (userId: string, userName: string, userEmail: string) => {
    const confirmado = await confirm({
      title: 'Resetear contraseña',
      message: `Se generará una contraseña temporal para ${userName}. La actual dejará de funcionar.`,
      confirmLabel: 'Resetear',
    });
    if (!confirmado) return;

    const { success, tempPassword } = await resetTempPassword(userId);

    if (success && tempPassword) {
      await loadUsers();
      // Diálogo con campo copiable, nunca un toast: esta contraseña se muestra una
      // sola vez y hay que comunicársela al usuario. Si se va sola, se pierde.
      await alert({
        title: 'Contraseña reseteada',
        message: `Usuario: ${userName}\nEmail: ${userEmail}\n\n`
          + 'Comunícasela al usuario. Deberá cambiarla en su próximo inicio de sesión.',
        copyable: { label: 'Contraseña temporal', value: tempPassword },
      });
    } else {
      notify.error('No se ha podido resetear la contraseña.');
    }
  };

  const secciones: ShellSection<AdminTab>[] = [
    { id: 'users', label: 'Usuarios', Icon: Users, badge: totalUsers },
    { id: 'suggestions', label: 'Sugerencias', Icon: Lightbulb, badge: totalSuggestions },
    { id: 'announcements', label: 'Anuncios', Icon: Megaphone },
    { id: 'voting', label: 'Votaciones', Icon: BarChart3 },
    { id: 'analytics', label: 'Analytics', Icon: TrendingUp },
    { id: 'interinos', label: 'Interinos', Icon: BookOpen },
    { id: 'results', label: 'Resultados', Icon: Award },
    { id: 'external-emails', label: 'Emails externos', Icon: Mail },
    { id: 'security', label: 'Seguridad', Icon: Shield },
    { id: 'convocatorias', label: 'Convocatorias BOE', Icon: Flame },
  ];

  return (
    <AdminShell
      sections={secciones}
      active={activeTab}
      onChange={setActiveTab}
      sessionMinutes={sessionTime}
      onLogout={handleLogout}
    >
      <div>
        {activeTab === 'users' && (
          <UsersSection
            usuarios={usuariosFiltrados}
            conteoEstados={conteoEstados}
            usuariosConTelegram={usuariosConTelegram}
            filtroPlantilla={filtroPlantilla}
            onFiltroChange={setFiltroPlantilla}
            onExport={handleExport}
            onToggleVoto={handleToggleVotingAuth}
            onResetPassword={handleResetTempPassword}
            onDelete={handleDeleteUser}
          />
        )}

        {activeTab === 'suggestions' && (
          <SuggestionsSection
            suggestions={suggestions}
            onExport={handleExportSuggestions}
            onClear={handleClearSuggestions}
            onDelete={handleDeleteSuggestion}
            renderDetalle={(s) => <SuggestionDetailsPanel suggestion={s} />}
          />
        )}


        {/* Announcements Manager */}
        {activeTab === 'announcements' && (
          <Suspense fallback={<TabLoadingSpinner />}>
            <AnnouncementsManager />
          </Suspense>
        )}

        {/* Voting Manager */}
        {activeTab === 'voting' && (
          <Suspense fallback={<TabLoadingSpinner />}>
            <VotingManager />
          </Suspense>
        )}

        {/* Analytics Dashboard */}
        {activeTab === 'analytics' && (
          <Suspense fallback={<TabLoadingSpinner />}>
            <AnalyticsDashboard onClose={() => setActiveTab('users')} />
          </Suspense>
        )}

        {/* Voting Results Panel */}
        {activeTab === 'results' && (
          <Suspense fallback={<TabLoadingSpinner />}>
            <VotingResultsPanel onClose={() => setActiveTab('voting')} />
          </Suspense>
        )}

        {/* External Emails Manager */}
        {activeTab === 'external-emails' && (
          <Suspense fallback={<TabLoadingSpinner />}>
            <ExternalEmailsManager />
          </Suspense>
        )}

        {activeTab === 'interinos' && (
          <Suspense fallback={<TabLoadingSpinner />}>
            <div className="space-y-8">
              <InterinosManager />
              <div className="border-t border-slate-700 pt-8">
                <InterinosAnalyticsDashboard />
              </div>
            </div>
          </Suspense>
        )}

        {/* Security Panel */}
        {activeTab === 'security' && (
          <Suspense fallback={<TabLoadingSpinner />}>
            <SecurityPanel />
          </Suspense>
        )}

        {/* BOE Convocatorias Panel */}
        {activeTab === 'convocatorias' && (
          <Suspense fallback={<TabLoadingSpinner />}>
            <BOEConvocatoriasAdmin />
          </Suspense>
        )}
      </div>
    </AdminShell>
  );
}

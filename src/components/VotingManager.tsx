import React, { useState, useEffect } from 'react';
import { useNotifications } from './ui/NotificationProvider';
import { BarChart3, Plus, Edit2, Trash2, Eye, EyeOff, CheckCircle, XCircle, Calendar, Users, Mail } from 'lucide-react';
import {
  getAllVotaciones,
  createVotacion,
  updateVotacion,
  deleteVotacion,
  togglePublicado,
  toggleResultadosPublicos,
  getResultadosVotacionAdmin,
  VotacionCompleta,
  ResultadoVotacion
} from '../services/votingDatabase';
import type { EmailRecipient } from '../services/emailNotificationService';
import { sendVotingTelegram, sendVotingResultsTelegram, type TelegramRecipient } from '../services/telegramNotificationService';
import { getAllUsers } from '../services/adminUsersService';
import NotificationModal from './NotificationModal';

/**
 * Las fechas de votación se editan con <input type="datetime-local">, que no
 * lleva zona horaria: su valor es "2026-09-10T10:17" a secas. Ese texto se
 * guardaba tal cual en una columna `timestamptz`, y Postgres lo interpretaba en
 * UTC — así que una votación programada para las 10:17 de la península quedaba
 * registrada a las 12:17 reales (+2 h en verano, +1 h en invierno).
 *
 * No se notaba porque al editar se hacía `fecha.slice(0, 16)` sobre el ISO, o
 * sea se metía la hora UTC en un campo que se lee como local: los dos errores
 * se cancelaban dentro del formulario. Lo que sí salía torcido era todo lo que
 * usa la fecha de verdad: si la votación está activa o finalizada, el tiempo
 * restante y las fechas de los correos.
 *
 * Por eso las dos conversiones van juntas: arreglar solo una rompe la simetría.
 */
function inputLocalAIso(valor: string): string {
  if (!valor) return valor;
  const d = new Date(valor); // sin zona → el navegador lo toma como hora local
  return isNaN(d.getTime()) ? valor : d.toISOString();
}

/**
 * Enlace que va en el correo y en el mensaje de Telegram. Lleva a la papeleta de
 * esa votación concreta (`/votacion/<id>`), no a la portada.
 *
 * Hasta ahora era `https://www.sepeiunido.org/#voting`, y ese ancla **no existe**
 * en la web (la sección de la portada es `votaciones-section`): el botón "Votar
 * ahora" dejaba al usuario en lo alto de la portada, buscando la votación a mano.
 *
 * Es un enlace normal, sin token ni identidad: abre la papeleta, y para emitir el
 * voto sigue haciendo falta la sesión del usuario. Reenviar este correo no permite
 * votar en nombre de nadie.
 */
function urlVotacion(id: string): string {
  return `https://www.sepeiunido.org/votacion/${id}`;
}

function isoAInputLocal(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

const VotingManager: React.FC = () => {
  const { notify, confirm, alert } = useNotifications();
  const [votaciones, setVotaciones] = useState<VotacionCompleta[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingVotacion, setEditingVotacion] = useState<VotacionCompleta | null>(null);
  const [showResults, setShowResults] = useState<string | null>(null);
  const [resultados, setResultados] = useState<ResultadoVotacion[]>([]);
  const [sendNotification, setSendNotification] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [pendingVotingData, setPendingVotingData] = useState<any>(null);
  const [notifyingVotingId, setNotifyingVotingId] = useState<string | null>(null);
  const [notificationType, setNotificationType] = useState<'new' | 'results'>('new');

  // Form state
  const [formData, setFormData] = useState({
    titulo: '',
    descripcion: '',
    tipo: 'votacion' as 'votacion' | 'encuesta' | 'referendum',
    fecha_inicio: '',
    fecha_fin: '',
    publicado: false,
    resultados_publicos: false,
    multiple_respuestas: false
  });

  const [opciones, setOpciones] = useState<string[]>(['', '']);

  useEffect(() => {
    loadVotaciones();
  }, []);

  const loadVotaciones = async () => {
    setLoading(true);
    const data = await getAllVotaciones();
    setVotaciones(data);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const opcionesFiltradas = opciones.filter(o => o.trim() !== '');
    if (opcionesFiltradas.length < 2) {
      notify.info('Debe haber al menos 2 opciones');
      return;
    }

    // Lo que se escribe en el formulario es hora local; a la base va siempre en UTC.
    const datos = {
      ...formData,
      fecha_inicio: inputLocalAIso(formData.fecha_inicio),
      fecha_fin: inputLocalAIso(formData.fecha_fin),
    };

    if (editingVotacion) {
      const opcionesData = opcionesFiltradas.map((texto, index) => ({
        texto,
        orden: index
      }));

      const success = await updateVotacion(
        editingVotacion.id,
        datos,
        opcionesData
      );

      if (success) {
        notify.success('Votación actualizada correctamente');
        resetForm();
        loadVotaciones();
      } else {
        notify.error('Error al actualizar la votación');
      }
    } else {
      const id = await createVotacion(datos, opcionesFiltradas);
      if (id) {
        // Si se marcó notificación y está publicado, abrir modal
        if (sendNotification && formData.publicado) {
          setPendingVotingData({
            id: id,
            titulo: formData.titulo,
            descripcion: formData.descripcion,
            tipo: formData.tipo,
            fecha_inicio: datos.fecha_inicio,
            fecha_fin: datos.fecha_fin
          });
          setShowNotificationModal(true);
        } else {
          notify.success('Votación creada correctamente');
          resetForm();
          loadVotaciones();
        }
      } else {
        notify.error('Error al crear la votación');
      }
    }
  };

  const handleEdit = (votacion: VotacionCompleta) => {
    setEditingVotacion(votacion);
    setFormData({
      titulo: votacion.titulo,
      descripcion: votacion.descripcion || '',
      tipo: votacion.tipo,
      fecha_inicio: isoAInputLocal(votacion.fecha_inicio),
      fecha_fin: isoAInputLocal(votacion.fecha_fin),
      publicado: votacion.publicado,
      resultados_publicos: votacion.resultados_publicos,
      multiple_respuestas: votacion.multiple_respuestas,
    });
    setOpciones(votacion.opciones.map(o => o.texto));
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    const confirmado = await confirm({
      title: 'Eliminar votación',
      message: 'Se eliminará la votación junto con sus opciones y los votos emitidos. Esta acción no se puede deshacer.',
      confirmLabel: 'Eliminar',
      variant: 'danger',
    });
    if (!confirmado) return;

    const success = await deleteVotacion(id);
    if (success) {
      notify.success('Votación eliminada correctamente');
      loadVotaciones();
    } else {
      notify.error('Error al eliminar la votación');
    }
  };

  const handleTogglePublicado = async (id: string, publicado: boolean) => {
    const success = await togglePublicado(id, !publicado);
    if (success) {
      loadVotaciones();
    }
  };

  const handleToggleResultados = async (id: string, resultados_publicos: boolean) => {
    const success = await toggleResultadosPublicos(id, !resultados_publicos);
    if (success) {
      loadVotaciones();
    }
  };

  const handleViewResults = async (id: string) => {
    try {
      const data = await getResultadosVotacionAdmin(id);
      setResultados(data);
      setShowResults(id);
    } catch (error) {
      console.error('Error al obtener resultados:', error);
      notify.error('No se han podido cargar los resultados');
    }
  };

  const handleSendNotifications = async (selectedUsers: EmailRecipient[]) => {
    if (!pendingVotingData) return;

    try {
      let emailResult;
      
      // ENVIAR POR EMAIL
      if (notificationType === 'results') {
        const { sendVotingResultsNotification } = await import('../services/emailNotificationService');
        
        emailResult = await sendVotingResultsNotification(
          selectedUsers,
          {
            titulo: pendingVotingData.titulo,
            descripcion: pendingVotingData.descripcion,
            tipo: pendingVotingData.tipo,
            total_votos: pendingVotingData.total_votos,
            resultados: pendingVotingData.resultados,
            url: urlVotacion(pendingVotingData.id)
          }
        );
      } else {
        const { sendVotingNotification } = await import('../services/emailNotificationService');
        emailResult = await sendVotingNotification(
          selectedUsers,
          {
            titulo: pendingVotingData.titulo,
            descripcion: pendingVotingData.descripcion,
            fecha_inicio: pendingVotingData.fecha_inicio,
            fecha_fin: pendingVotingData.fecha_fin,
            url: urlVotacion(pendingVotingData.id)
          }
        );
      }

      // ENVIAR POR TELEGRAM
      const userIds = selectedUsers
        .filter(u => u.id && !u.id.startsWith('external_'))
        .map(u => u.id);
      
      let telegramSuccess = 0;
      let telegramFailed = 0;
      
      if (userIds.length > 0) {
        // Buscar usuarios con telegram_chat_id
        const allUsers = await getAllUsers();
        const telegramUsers = allUsers.filter((u) => userIds.includes(u.id) && u.telegram_chat_id);

        if (telegramUsers.length > 0) {
          const telegramRecipients: TelegramRecipient[] = telegramUsers.map(u => ({
            id: u.id,
            telegram_chat_id: u.telegram_chat_id!,
            nombre: u.nombre,
            apellidos: u.apellidos
          }));

          let telegramResult;

          if (notificationType === 'results') {
            telegramResult = await sendVotingResultsTelegram(
              telegramRecipients,
              {
                titulo: pendingVotingData.titulo,
                descripcion: pendingVotingData.descripcion,
                total_votos: pendingVotingData.total_votos,
                resultados: pendingVotingData.resultados,
                url: urlVotacion(pendingVotingData.id)
              }
            );
          } else {
            telegramResult = await sendVotingTelegram(
              telegramRecipients,
              {
                titulo: pendingVotingData.titulo,
                descripcion: pendingVotingData.descripcion,
                fecha_inicio: pendingVotingData.fecha_inicio,
                fecha_fin: pendingVotingData.fecha_fin,
                url: urlVotacion(pendingVotingData.id)
              }
            );
          }
          
          telegramSuccess = telegramResult.success;
          telegramFailed = telegramResult.failed;
        }
      }

      // Mostrar resumen de ambos canales
      const { success: emailSuccess, failed: emailFailed } = emailResult;
      let message = `Email: ${emailSuccess} enviadas, ${emailFailed} fallidas`;
      if (telegramSuccess > 0 || telegramFailed > 0) {
        message += `\nTelegram: ${telegramSuccess} enviadas, ${telegramFailed} fallidas`;
      }

      // Diálogo y no toast: es un recuento de envíos que el admin necesita leer
      // entero, y algunas pueden haber fallado.
      await alert({ title: 'Notificaciones enviadas', message });
      
      setShowNotificationModal(false);
      setPendingVotingData(null);
      setNotifyingVotingId(null);
      setNotificationType('new');
      
      // Solo resetear form si estábamos creando nueva votación
      if (!notifyingVotingId) {
        await loadVotaciones();
        resetForm();
      }
    } catch (error) {
      console.error('Error enviando notificaciones:', error);
      notify.error('Error al enviar notificaciones');
    }
  };

  const handleNotifyExistingVoting = async (votacion: VotacionCompleta, type: 'new' | 'results') => {
    // Avisar de una votación ya cerrada como si fuera nueva casi siempre es un
    // despiste: el correo anuncia una votación y quien lo abre no puede votar.
    // Se avisa, pero no se prohíbe: puede querer recordarla a propósito.
    if (type === 'new' && new Date() > new Date(votacion.fecha_fin)) {
      const seguir = await confirm({
        title: 'Esta votación ya ha terminado',
        message: `Cerró el ${new Date(votacion.fecha_fin).toLocaleString('es-ES')}.\n\n`
          + 'El aviso anuncia una votación, y quien lo abra no va a poder votar. '
          + 'Si lo que querías era mandar el recuento, cancela y usa el botón de resultados.',
        confirmLabel: 'Enviar de todas formas',
      });
      if (!seguir) return;
    }

    setNotificationType(type);
    setNotifyingVotingId(votacion.id);
    
    if (type === 'results') {
      // Para resultados, necesitamos cargar los datos completos. Con la acción
      // pública esto devolvía [] en una votación de resultados no públicos, y se
      // acababa enviando a la gente un correo de resultados con cero votos.
      getResultadosVotacionAdmin(votacion.id).then(resultados => {
        const totalVotos = resultados.reduce((sum, r) => sum + r.total_votos, 0);
        const resultadosFormateados = resultados.map(r => ({
          opcion: r.texto,
          votos: r.total_votos,
          porcentaje: r.porcentaje
        })).sort((a, b) => b.votos - a.votos);

        setPendingVotingData({
          id: votacion.id,
          titulo: votacion.titulo,
          descripcion: votacion.descripcion,
          tipo: votacion.tipo,
          total_votos: totalVotos,
          resultados: resultadosFormateados
        });
        setShowNotificationModal(true);
      }).catch(error => {
        console.error('Error al obtener resultados:', error);
        notify.error('No se han podido cargar los resultados: no se envía nada');
        setNotifyingVotingId(null);
      });
    } else {
      setPendingVotingData({
        id: votacion.id,
        titulo: votacion.titulo,
        descripcion: votacion.descripcion,
        tipo: votacion.tipo,
        fecha_inicio: votacion.fecha_inicio,
        fecha_fin: votacion.fecha_fin
      });
      setShowNotificationModal(true);
    }
  };

  const resetForm = () => {
    setFormData({
      titulo: '',
      descripcion: '',
      tipo: 'votacion',
      fecha_inicio: '',
      fecha_fin: '',
      publicado: false,
      resultados_publicos: false,
      multiple_respuestas: false,
    });
    setOpciones(['', '']);
    setEditingVotacion(null);
    setShowForm(false);
    setSendNotification(false);
  };

  const addOpcion = () => {
    setOpciones([...opciones, '']);
  };

  const removeOpcion = (index: number) => {
    if (opciones.length > 2) {
      setOpciones(opciones.filter((_, i) => i !== index));
    }
  };

  const updateOpcion = (index: number, value: string) => {
    const newOpciones = [...opciones];
    newOpciones[index] = value;
    setOpciones(newOpciones);
  };

  const getEstadoVotacion = (votacion: VotacionCompleta) => {
    const now = new Date();
    const inicio = new Date(votacion.fecha_inicio);
    const fin = new Date(votacion.fecha_fin);

    if (!votacion.publicado) return { texto: 'No publicada', color: 'text-gray-400' };
    if (now < inicio) return { texto: 'Programada', color: 'text-blue-400' };
    if (now > fin) return { texto: 'Finalizada', color: 'text-red-400' };
    return { texto: 'Activa', color: 'text-green-400' };
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <p className="text-slate-400 text-sm">Crea y gestiona votaciones, encuestas y referendums</p>
        <button
          onClick={() => setShowForm(true)}
          className="shrink-0 px-4 sm:px-6 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold rounded-xl hover:shadow-lg transform hover:scale-105 transition-all flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Nueva Votación
        </button>
      </div>

      {/* Formulario */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-slate-800 rounded-2xl shadow-2xl max-w-3xl w-full my-8">
            <div className="p-6 border-b border-slate-700">
              <h3 className="text-2xl font-bold text-white">
                {editingVotacion ? 'Editar Votación' : 'Nueva Votación'}
              </h3>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Título */}
              <div>
                <label className="block text-white font-semibold mb-2">Título *</label>
                <input
                  type="text"
                  value={formData.titulo}
                  onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-white font-semibold mb-2">Descripción</label>
                <textarea
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  rows={3}
                />
              </div>

              {/* Tipo */}
              <div>
                <label className="block text-white font-semibold mb-2">Tipo *</label>
                <select
                  value={formData.tipo}
                  onChange={(e) => setFormData({ ...formData, tipo: e.target.value as any })}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  required
                >
                  <option value="votacion">Votación</option>
                  <option value="encuesta">Encuesta</option>
                  <option value="referendum">Referéndum</option>
                </select>
              </div>

              {/* Fechas */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-white font-semibold mb-2">Fecha Inicio *</label>
                  <input
                    type="datetime-local"
                    value={formData.fecha_inicio}
                    onChange={(e) => setFormData({ ...formData, fecha_inicio: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-white font-semibold mb-2">Fecha Fin *</label>
                  <input
                    type="datetime-local"
                    value={formData.fecha_fin}
                    onChange={(e) => setFormData({ ...formData, fecha_fin: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              {/* Opciones */}
              <div>
                <label className="block text-white font-semibold mb-2">Opciones * (mínimo 2)</label>
                <div className="space-y-3">
                  {opciones.map((opcion, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={opcion}
                        onChange={(e) => updateOpcion(index, e.target.value)}
                        className="flex-1 px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder={`Opción ${index + 1}`}
                        required
                      />
                      {opciones.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeOpcion(index)}
                          className="px-4 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addOpcion}
                  className="mt-3 px-4 py-2 bg-slate-700 text-white rounded-xl hover:bg-slate-600 transition-colors flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Añadir Opción
                </button>
              </div>

              {/* Checkboxes */}
              <div className="space-y-3">
                <label className="flex items-center gap-3 text-white cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.publicado}
                    onChange={(e) => setFormData({ ...formData, publicado: e.target.checked })}
                    className="w-5 h-5 text-orange-500 focus:ring-orange-500 rounded"
                  />
                  <span>Publicar inmediatamente</span>
                </label>

                <label className="flex items-center gap-3 text-white cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.resultados_publicos}
                    onChange={(e) => setFormData({ ...formData, resultados_publicos: e.target.checked })}
                    className="w-5 h-5 text-orange-500 focus:ring-orange-500 rounded"
                  />
                  <span>Resultados públicos</span>
                </label>

                <label className="flex items-center gap-3 text-white cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.multiple_respuestas}
                    onChange={(e) => setFormData({ ...formData, multiple_respuestas: e.target.checked })}
                    className="w-5 h-5 text-orange-500 focus:ring-orange-500 rounded"
                  />
                  <span>Permitir múltiples respuestas</span>
                </label>

                {!editingVotacion && (
                  <label className="flex items-center gap-3 text-orange-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sendNotification}
                      onChange={(e) => setSendNotification(e.target.checked)}
                      className="w-5 h-5 text-orange-500 focus:ring-orange-500 rounded"
                    />
                    <Mail className="w-5 h-5" />
                    <span>Notificar por email</span>
                  </label>
                )}
              </div>

              {/* Botones */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold rounded-xl hover:shadow-lg transform hover:scale-105 transition-all"
                >
                  {editingVotacion ? 'Actualizar' : 'Crear'} Votación
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-3 bg-slate-700 text-white font-bold rounded-xl hover:bg-slate-600 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Resultados */}
      {showResults && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-700">
              <h3 className="text-2xl font-bold text-white">Resultados de Votación</h3>
            </div>

            <div className="p-6 space-y-4">
              {resultados.length === 0 && (
                <p className="text-slate-400 text-center py-4">
                  Todavía no se ha registrado ningún voto.
                </p>
              )}
              {resultados.map((resultado) => (
                <div key={resultado.opcion_id} className="space-y-2">
                  <div className="flex justify-between text-white">
                    <span>{resultado.texto}</span>
                    <span className="font-bold">{resultado.total_votos} votos ({resultado.porcentaje}%)</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-4 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-orange-500 to-red-600 h-full transition-all duration-500"
                      style={{ width: `${resultado.porcentaje}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="p-6 border-t border-slate-700">
              <button
                onClick={() => setShowResults(null)}
                className="w-full px-6 py-3 bg-slate-700 text-white font-bold rounded-xl hover:bg-slate-600 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lista de Votaciones */}
      <div className="grid gap-4">
        {votaciones.length === 0 ? (
          <div className="text-center py-12 bg-slate-800/50 rounded-xl">
            <BarChart3 className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">No hay votaciones creadas</p>
          </div>
        ) : (
          votaciones.map((votacion) => {
            const estado = getEstadoVotacion(votacion);
            return (
              <div
                key={votacion.id}
                className="bg-slate-800/50 rounded-xl p-4 sm:p-6 border border-slate-700 hover:border-orange-500/50 transition-all"
              >
                <div className="flex flex-col lg:flex-row lg:justify-between items-start gap-4 mb-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                      <h3 className="text-lg sm:text-xl font-bold text-white">{votacion.titulo}</h3>
                      <span className={`text-sm font-semibold ${estado.color}`}>
                        {estado.texto}
                      </span>
                    </div>
                    {votacion.descripcion && (
                      <p className="text-gray-400 mb-3">{votacion.descripcion}</p>
                    )}
                    <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(votacion.fecha_inicio).toLocaleDateString()} - {new Date(votacion.fecha_fin).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {votacion.total_votos} votos
                      </span>
                      <span className="px-2 py-1 bg-slate-700 rounded text-xs">
                        {votacion.tipo.toUpperCase()}
                      </span>
                      {votacion.multiple_respuestas && (
                        <span className="px-2 py-1 bg-blue-600 rounded text-xs">Múltiple</span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 shrink-0">
                    <button
                      onClick={() => handleNotifyExistingVoting(votacion, 'new')}
                      className="p-2 bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors"
                      title="Notificar votación"
                    >
                      <Mail className="w-5 h-5" />
                    </button>

                    {new Date() > new Date(votacion.fecha_fin) && (
                      <button
                        onClick={() => handleNotifyExistingVoting(votacion, 'results')}
                        className="p-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                        title="Enviar resultados"
                      >
                        <BarChart3 className="w-5 h-5" />
                      </button>
                    )}

                    <button
                      onClick={() => handleTogglePublicado(votacion.id, votacion.publicado)}
                      className={`p-2 rounded-lg transition-colors ${
                        votacion.publicado
                          ? 'bg-green-600 hover:bg-green-700'
                          : 'bg-gray-600 hover:bg-gray-700'
                      }`}
                      title={votacion.publicado ? 'Despublicar' : 'Publicar'}
                    >
                      {votacion.publicado ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                    </button>

                    <button
                      onClick={() => handleToggleResultados(votacion.id, votacion.resultados_publicos)}
                      className={`p-2 rounded-lg transition-colors ${
                        votacion.resultados_publicos
                          ? 'bg-blue-600 hover:bg-blue-700'
                          : 'bg-gray-600 hover:bg-gray-700'
                      }`}
                      title={votacion.resultados_publicos ? 'Ocultar resultados' : 'Mostrar resultados'}
                    >
                      {votacion.resultados_publicos ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                    </button>

                    <button
                      onClick={() => handleViewResults(votacion.id)}
                      className="p-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
                      title="Ver resultados"
                    >
                      <BarChart3 className="w-5 h-5" />
                    </button>

                    <button
                      onClick={() => handleEdit(votacion)}
                      className="p-2 bg-slate-600 hover:bg-slate-700 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>

                    <button
                      onClick={() => handleDelete(votacion.id)}
                      className="p-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Opciones */}
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {votacion.opciones.map((opcion) => (
                    <div key={opcion.id} className="px-3 py-2 bg-slate-700/50 rounded-lg text-sm text-gray-300">
                      {opcion.texto}
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      <NotificationModal
        isOpen={showNotificationModal}
        onClose={() => {
          setShowNotificationModal(false);
          setPendingVotingData(null);
          setNotifyingVotingId(null);
          setNotificationType('new');
        }}
        onConfirm={handleSendNotifications}
        title={notificationType === 'results' ? 'Enviar resultados de votación' : 'Notificar nueva votación'}
      />
    </div>
  );
};

export default VotingManager;

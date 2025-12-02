import React, { useState, useEffect } from 'react';
import { Mail, Plus, Trash2, Edit2, X, Check, AlertCircle } from 'lucide-react';
import {
  ExternalEmail,
  getAllExternalEmails,
  createExternalEmail,
  updateExternalEmail,
  deleteExternalEmail,
  toggleExternalEmailStatus
} from '../services/externalEmailsDatabase';

export function ExternalEmailsManager() {
  const [externalEmails, setExternalEmails] = useState<ExternalEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form state
  const [formEmail, setFormEmail] = useState('');
  const [formNombre, setFormNombre] = useState('');
  const [formDescripcion, setFormDescripcion] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    loadExternalEmails();
  }, []);

  const loadExternalEmails = async () => {
    setLoading(true);
    const emails = await getAllExternalEmails();
    setExternalEmails(emails);
    setLoading(false);
  };

  const handleOpenModal = (email?: ExternalEmail) => {
    if (email) {
      setEditingId(email.id);
      setFormEmail(email.email);
      setFormNombre(email.nombre);
      setFormDescripcion(email.descripcion || '');
    } else {
      resetForm();
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    resetForm();
  };

  const resetForm = () => {
    setEditingId(null);
    setFormEmail('');
    setFormNombre('');
    setFormDescripcion('');
    setFormError('');
  };

  const validateEmail = (email: string): boolean => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    // Validaciones
    if (!formEmail.trim() || !formNombre.trim()) {
      setFormError('Email y nombre son obligatorios');
      return;
    }

    if (!validateEmail(formEmail)) {
      setFormError('Formato de email inválido');
      return;
    }

    const success = editingId
      ? await updateExternalEmail(editingId, {
          email: formEmail,
          nombre: formNombre,
          descripcion: formDescripcion || undefined
        })
      : await createExternalEmail(formEmail, formNombre, formDescripcion);

    if (success) {
      await loadExternalEmails();
      handleCloseModal();
      alert(editingId ? 'Email actualizado correctamente' : 'Email agregado correctamente');
    } else {
      setFormError(editingId ? 'Error al actualizar el email' : 'Error al agregar el email. Puede que ya exista.');
    }
  };

  const handleDelete = async (id: string, nombre: string) => {
    if (!confirm(`¿Eliminar el contacto "${nombre}"?`)) return;

    const success = await deleteExternalEmail(id);
    if (success) {
      await loadExternalEmails();
      alert('Contacto eliminado correctamente');
    } else {
      alert('Error al eliminar el contacto');
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    const success = await toggleExternalEmailStatus(id, !currentStatus);
    if (success) {
      await loadExternalEmails();
    } else {
      alert('Error al cambiar el estado');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="text-gray-400">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Emails Externos</h2>
          <p className="text-gray-400 text-sm mt-1">
            Gestiona contactos externos que recibirán notificaciones
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition"
        >
          <Plus className="w-5 h-5" />
          Agregar Email
        </button>
      </div>

      {/* Lista de emails */}
      {externalEmails.length === 0 ? (
        <div className="bg-gray-800 rounded-lg p-8 text-center">
          <Mail className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No hay emails externos registrados</p>
          <button
            onClick={() => handleOpenModal()}
            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
          >
            Agregar el primero
          </button>
        </div>
      ) : (
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Email</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Nombre</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Descripción</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-300">Estado</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-300">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {externalEmails.map((email) => (
                <tr key={email.id} className="hover:bg-gray-750">
                  <td className="px-4 py-3 text-sm text-white">{email.email}</td>
                  <td className="px-4 py-3 text-sm text-white">{email.nombre}</td>
                  <td className="px-4 py-3 text-sm text-gray-400">{email.descripcion || '-'}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleToggleStatus(email.id, email.activo)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                        email.activo
                          ? 'bg-green-600 hover:bg-green-700 text-white'
                          : 'bg-gray-600 hover:bg-gray-700 text-gray-300'
                      }`}
                    >
                      {email.activo ? 'Activo' : 'Inactivo'}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => handleOpenModal(email)}
                        className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(email.id, email.nombre)}
                        className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Agregar/Editar */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">
                {editingId ? 'Editar Email Externo' : 'Agregar Email Externo'}
              </h3>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-white transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="ejemplo@email.com"
                  required
                />
              </div>

              {/* Nombre */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Nombre *
                </label>
                <input
                  type="text"
                  value={formNombre}
                  onChange={(e) => setFormNombre(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Nombre del contacto"
                  required
                />
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Descripción (opcional)
                </label>
                <textarea
                  value={formDescripcion}
                  onChange={(e) => setFormDescripcion(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="Ej: Presidente provincial, Contacto de prensa..."
                  rows={2}
                />
              </div>

              {/* Error */}
              {formError && (
                <div className="flex items-center gap-2 p-3 bg-red-900/50 border border-red-600 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                  <span className="text-sm text-red-300">{formError}</span>
                </div>
              )}

              {/* Botones */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center gap-2 transition"
                >
                  <Check className="w-5 h-5" />
                  {editingId ? 'Guardar' : 'Agregar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

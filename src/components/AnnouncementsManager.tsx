import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Eye, EyeOff, Image, FileText, X, Upload, Star, Mail, Link2, Video, Music, FilePlus2, Trash } from 'lucide-react';
import {
  getAllAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  uploadAnnouncementImage,
  uploadAnnouncementFile,
  addAnnouncementAttachment,
  deleteAnnouncementAttachment,
  type Announcement,
  type AnnouncementAttachment
} from '../services/announcementDatabase';
import { sendAnnouncementNotification, type EmailRecipient } from '../services/emailNotificationService';
import NotificationModal from './NotificationModal';

export default function AnnouncementsManager() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    titulo: '',
    contenido: '',
    categoria: 'noticia' as 'noticia' | 'comunicado' | 'evento' | 'urgente',
    publicado: false,
    destacado: false,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  const [attachmentLinks, setAttachmentLinks] = useState<{ url: string; title: string }[]>([]);
  const [linkInput, setLinkInput] = useState('');
  const [linkTitleInput, setLinkTitleInput] = useState('');
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [sendNotification, setSendNotification] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [pendingAnnouncementData, setPendingAnnouncementData] = useState<any>(null);
  const [notifyingAnnouncementId, setNotifyingAnnouncementId] = useState<string | null>(null);

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const loadAnnouncements = async () => {
    const data = await getAllAnnouncements();
    setAnnouncements(data);
  };

  const categorizeAttachment = (file: File): AnnouncementAttachment['categoria'] => {
    if (file.type.startsWith('video')) return 'video';
    if (file.type.startsWith('audio')) return 'audio';
    return 'documento';
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length) {
      setAttachmentFiles((prev) => [...prev, ...files]);
    }
  };

  const handleRemoveNewFile = (name: string) => {
    setAttachmentFiles((prev) => prev.filter((f) => f.name !== name));
  };

  const handleAddLink = () => {
    if (!linkInput.trim()) return;
    try {
      const url = new URL(linkInput.trim());
      setAttachmentLinks((prev) => [...prev, { url: url.toString(), title: linkTitleInput.trim() || url.host }]);
      setLinkInput('');
      setLinkTitleInput('');
    } catch {
      alert('Link no válido');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setUploadProgress('Procesando...');

    try {
      let imagen_url = editingId ? announcements.find(a => a.id === editingId)?.imagen_url : undefined;

      // Subir imagen si hay una nueva
      if (imageFile) {
        setUploadProgress('Subiendo imagen...');
        const uploadedImageUrl = await uploadAnnouncementImage(imageFile);
        if (uploadedImageUrl) imagen_url = uploadedImageUrl;
      }

      const announcementData = {
        ...formData,
        imagen_url,
        fecha_publicacion: new Date().toISOString(),
        autor: 'Administrador', // Puedes cambiarlo por el usuario actual
      } as any;

      let targetId = editingId;

      if (editingId) {
        await updateAnnouncement(editingId, announcementData);
      } else {
        const newAnnouncement = await createAnnouncement(announcementData);
        targetId = newAnnouncement?.id || null;

        // Si se marcó enviar notificación y está publicado, abrir modal
        if (sendNotification && formData.publicado && newAnnouncement) {
          setPendingAnnouncementData({
            id: newAnnouncement.id,
            titulo: announcementData.titulo,
            descripcion: announcementData.contenido,
            categoria: announcementData.categoria
          });
          setShowNotificationModal(true);
        }
      }

      // Subir y registrar adjuntos nuevos
      if (targetId) {
        for (const file of attachmentFiles) {
          setUploadProgress(`Subiendo ${file.name}...`);
          const uploadedFileUrl = await uploadAnnouncementFile(file);
          if (uploadedFileUrl) {
            await addAnnouncementAttachment({
              announcement_id: targetId,
              url: uploadedFileUrl,
              nombre: file.name,
              tipo: file.type,
              categoria: categorizeAttachment(file),
            });
          }
        }

        for (const link of attachmentLinks) {
          await addAnnouncementAttachment({
            announcement_id: targetId,
            url: link.url,
            nombre: link.title,
            tipo: 'link',
            categoria: 'link',
          });
        }
      }

      await loadAnnouncements();
      resetForm();
    } catch (error) {
      console.error('Error al guardar anuncio:', error);
      alert('Error al guardar el anuncio');
    } finally {
      setIsLoading(false);
      setUploadProgress('');
    }
  };

  const handleEdit = (announcement: Announcement) => {
    setEditingId(announcement.id);
    setFormData({
      titulo: announcement.titulo,
      contenido: announcement.contenido,
      categoria: announcement.categoria,
      publicado: announcement.publicado,
      destacado: announcement.destacado,
    });
    setImagePreview(announcement.imagen_url || null);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de que quieres eliminar este anuncio?')) {
      await deleteAnnouncement(id);
      await loadAnnouncements();
    }
  };

  const togglePublished = async (announcement: Announcement) => {
    await updateAnnouncement(announcement.id, { publicado: !announcement.publicado });
    await loadAnnouncements();
  };

  const toggleDestacado = async (announcement: Announcement) => {
    await updateAnnouncement(announcement.id, { destacado: !announcement.destacado });
    await loadAnnouncements();
  };

  const resetForm = () => {
    setFormData({
      titulo: '',
      contenido: '',
      categoria: 'noticia',
      publicado: false,
      destacado: false,
    });
    setImageFile(null);
    setImagePreview(null);
    setAttachmentFiles([]);
    setAttachmentLinks([]);
    setLinkInput('');
    setLinkTitleInput('');
    setEditingId(null);
    setShowForm(false);
    setSendNotification(false);
  };

  const editingAnnouncement = editingId ? announcements.find(a => a.id === editingId) : null;

  const handleDeleteExistingAttachment = async (attachmentId: string) => {
    const confirmed = confirm('¿Eliminar este adjunto?');
    if (!confirmed) return;
    await deleteAnnouncementAttachment(attachmentId);
    await loadAnnouncements();
  };

  const handleSendNotifications = async (selectedUsers: EmailRecipient[]) => {
    if (!pendingAnnouncementData) return;

    setUploadProgress('Enviando notificaciones...');
    
    try {
      const { success, failed } = await sendAnnouncementNotification(
        selectedUsers,
        {
          titulo: pendingAnnouncementData.titulo,
          descripcion: pendingAnnouncementData.descripcion,
          categoria: pendingAnnouncementData.categoria,
          url: `https://www.sepeiunido.org/#announcements`
        }
      );

      alert(`✅ Notificaciones enviadas:\n${success} exitosas\n${failed} fallidas`);
      setShowNotificationModal(false);
      setPendingAnnouncementData(null);
      setNotifyingAnnouncementId(null);
      
      // Solo resetear form si estábamos creando nuevo anuncio
      if (editingId === null && !notifyingAnnouncementId) {
        await loadAnnouncements();
        resetForm();
      }
    } catch (error) {
      console.error('Error enviando notificaciones:', error);
      alert('❌ Error al enviar notificaciones');
    } finally {
      setUploadProgress('');
    }
  };

  const handleNotifyExistingAnnouncement = (announcement: Announcement) => {
    setPendingAnnouncementData({
      id: announcement.id,
      titulo: announcement.titulo,
      descripcion: announcement.contenido,
      categoria: announcement.categoria
    });
    setNotifyingAnnouncementId(announcement.id);
    setShowNotificationModal(true);
  };

  const getCategoryColor = (categoria: string) => {
    const colors = {
      noticia: 'bg-blue-500',
      comunicado: 'bg-green-500',
      evento: 'bg-purple-500',
      urgente: 'bg-red-500',
    };
    return colors[categoria as keyof typeof colors] || 'bg-gray-500';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Gestión de Anuncios</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition"
        >
          {showForm ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
          {showForm ? 'Cancelar' : 'Nuevo Anuncio'}
        </button>
      </div>

      {/* Formulario */}
      {showForm && (
        <div className="bg-slate-800/90 rounded-2xl border-2 border-slate-700/50 p-6">
          <h3 className="text-xl font-bold text-white mb-4">
            {editingId ? 'Editar Anuncio' : 'Nuevo Anuncio'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-gray-300 mb-2">Título *</label>
              <input
                type="text"
                value={formData.titulo}
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                required
              />
            </div>

            <div>
              <label className="block text-gray-300 mb-2">Contenido *</label>
              <textarea
                value={formData.contenido}
                onChange={(e) => setFormData({ ...formData, contenido: e.target.value })}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white h-32"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-300 mb-2">Categoría *</label>
                <select
                  value={formData.categoria}
                  onChange={(e) => setFormData({ ...formData, categoria: e.target.value as any })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                >
                  <option value="noticia">Noticia</option>
                  <option value="comunicado">Comunicado</option>
                  <option value="evento">Evento</option>
                  <option value="urgente">Urgente</option>
                </select>
              </div>

              <div className="flex items-end gap-4">
                <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.publicado}
                    onChange={(e) => setFormData({ ...formData, publicado: e.target.checked })}
                    className="w-5 h-5"
                  />
                  Publicar
                </label>
                <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.destacado}
                    onChange={(e) => setFormData({ ...formData, destacado: e.target.checked })}
                    className="w-5 h-5"
                  />
                  Destacado
                </label>
                {!editingId && (
                  <label className="flex items-center gap-2 text-orange-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sendNotification}
                      onChange={(e) => setSendNotification(e.target.checked)}
                      className="w-5 h-5 text-orange-500 focus:ring-orange-500"
                    />
                    <Mail className="w-5 h-5" />
                    Notificar por email
                  </label>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-300 mb-2">Imagen</label>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white cursor-pointer hover:bg-slate-600">
                    <Image className="w-5 h-5" />
                    Seleccionar imagen
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>
                  {imageFile && <span className="text-green-400 text-sm">{imageFile.name}</span>}
                </div>
                {imagePreview && (
                  <img src={imagePreview} alt="Preview" className="mt-2 w-full h-32 object-cover rounded-lg" />
                )}
              </div>

              <div>
                <label className="block text-gray-300 mb-2">Adjuntos (documentos, videos, audios)</label>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white cursor-pointer hover:bg-slate-600">
                    <FilePlus2 className="w-5 h-5" />
                    Añadir archivos
                    <input
                      type="file"
                      multiple
                      onChange={handleAttachmentChange}
                      className="hidden"
                    />
                  </label>
                </div>
                {attachmentFiles.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {attachmentFiles.map((file) => (
                      <div key={file.name} className="flex items-center justify-between bg-slate-700/50 px-3 py-2 rounded-lg text-sm text-gray-200">
                        <div className="flex items-center gap-2">
                          {file.type.startsWith('video') ? <Video className="w-4 h-4 text-orange-400" /> : file.type.startsWith('audio') ? <Music className="w-4 h-4 text-green-400" /> : <FileText className="w-4 h-4 text-blue-400" />}
                          <span className="truncate max-w-xs">{file.name}</span>
                        </div>
                        <button type="button" onClick={() => handleRemoveNewFile(file.name)} className="text-red-400 hover:text-red-300">
                          <Trash className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-300 mb-2">Enlaces</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={linkInput}
                    onChange={(e) => setLinkInput(e.target.value)}
                    placeholder="https://..."
                    className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  />
                  <input
                    type="text"
                    value={linkTitleInput}
                    onChange={(e) => setLinkTitleInput(e.target.value)}
                    placeholder="Título (opcional)"
                    className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  />
                  <button
                    type="button"
                    onClick={handleAddLink}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
                  >
                    Añadir link
                  </button>
                </div>
                {attachmentLinks.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {attachmentLinks.map((link) => (
                      <div key={link.url} className="flex items-center justify-between bg-slate-700/50 px-3 py-2 rounded-lg text-sm text-gray-200">
                        <div className="flex items-center gap-2">
                          <Link2 className="w-4 h-4 text-orange-400" />
                          <span className="truncate max-w-xs">{link.title}</span>
                        </div>
                        <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline text-xs">Ver</a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {editingAnnouncement?.attachments && editingAnnouncement.attachments.length > 0 && (
              <div className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-4 space-y-2">
                <p className="text-sm text-gray-300 font-semibold">Adjuntos existentes</p>
                {editingAnnouncement.attachments.map((att) => (
                  <div key={att.id} className="flex items-center justify-between bg-slate-700/40 px-3 py-2 rounded-lg text-sm text-gray-200">
                    <div className="flex items-center gap-2">
                      {att.categoria === 'video' ? <Video className="w-4 h-4 text-orange-400" /> : att.categoria === 'audio' ? <Music className="w-4 h-4 text-green-400" /> : att.categoria === 'link' ? <Link2 className="w-4 h-4 text-orange-300" /> : <FileText className="w-4 h-4 text-blue-400" />}
                      <a href={att.url} target="_blank" rel="noopener noreferrer" className="truncate max-w-[220px] hover:underline text-blue-300">{att.nombre}</a>
                    </div>
                    <button type="button" onClick={() => handleDeleteExistingAttachment(att.id)} className="text-red-400 hover:text-red-300">
                      <Trash className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {uploadProgress && (
              <div className="text-blue-400 text-sm">{uploadProgress}</div>
            )}

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg font-semibold transition"
              >
                {isLoading ? 'Guardando...' : editingId ? 'Actualizar' : 'Crear'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold transition"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de anuncios */}
      <div className="space-y-4">
        {announcements.length === 0 ? (
          <div className="bg-slate-800/90 rounded-2xl border-2 border-slate-700/50 p-12 text-center">
            <p className="text-gray-400 text-lg">No hay anuncios creados aún</p>
          </div>
        ) : (
          announcements.map((announcement) => (
            <div
              key={announcement.id}
              className="bg-slate-800/90 rounded-2xl border-2 border-slate-700/50 p-6 hover:border-slate-600 transition"
            >
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`${getCategoryColor(announcement.categoria)} px-3 py-1 rounded-full text-white text-xs font-semibold`}>
                      {announcement.categoria.toUpperCase()}
                    </span>
                    {announcement.destacado && (
                      <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                    )}
                    {announcement.publicado ? (
                      <span className="text-green-400 text-sm flex items-center gap-1">
                        <Eye className="w-4 h-4" /> Publicado
                      </span>
                    ) : (
                      <span className="text-gray-400 text-sm flex items-center gap-1">
                        <EyeOff className="w-4 h-4" /> Borrador
                      </span>
                    )}
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">{announcement.titulo}</h3>
                  <p className="text-gray-400 mb-3">{announcement.contenido.substring(0, 200)}...</p>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>Por: {announcement.autor}</span>
                    <span>Vistas: {announcement.vistas}</span>
                    <span>{new Date(announcement.fecha_publicacion).toLocaleDateString()}</span>
                  </div>
                  {announcement.imagen_url && (
                    <img src={announcement.imagen_url} alt={announcement.titulo} className="mt-3 w-full h-48 object-cover rounded-lg" />
                  )}
                  {announcement.attachments && announcement.attachments.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2 text-sm">
                      {announcement.attachments.map((att) => (
                        <a
                          key={att.id}
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 px-2 py-1 bg-slate-700 rounded-lg text-blue-300 hover:text-white hover:bg-slate-600"
                        >
                          {att.categoria === 'video' ? <Video className="w-4 h-4" /> : att.categoria === 'audio' ? <Music className="w-4 h-4" /> : att.categoria === 'link' ? <Link2 className="w-4 h-4" /> : <FileText className="w-4 h-4" />} 
                          <span className="truncate max-w-[200px]">{att.nombre}</span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => handleNotifyExistingAnnouncement(announcement)}
                    className="p-2 bg-orange-600 hover:bg-orange-700 rounded-lg transition"
                    title="Notificar por email"
                  >
                    <Mail className="w-5 h-5 text-white" />
                  </button>
                  <button
                    onClick={() => toggleDestacado(announcement)}
                    className={`p-2 rounded-lg transition ${announcement.destacado ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-slate-700 hover:bg-slate-600'}`}
                    title="Destacar"
                  >
                    <Star className="w-5 h-5 text-white" />
                  </button>
                  <button
                    onClick={() => togglePublished(announcement)}
                    className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition"
                    title={announcement.publicado ? 'Despublicar' : 'Publicar'}
                  >
                    {announcement.publicado ? <EyeOff className="w-5 h-5 text-white" /> : <Eye className="w-5 h-5 text-white" />}
                  </button>
                  <button
                    onClick={() => handleEdit(announcement)}
                    className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition"
                    title="Editar"
                  >
                    <Edit2 className="w-5 h-5 text-white" />
                  </button>
                  <button
                    onClick={() => handleDelete(announcement.id)}
                    className="p-2 bg-red-600 hover:bg-red-700 rounded-lg transition"
                    title="Eliminar"
                  >
                    <Trash2 className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <NotificationModal
        isOpen={showNotificationModal}
        onClose={() => {
          setShowNotificationModal(false);
          setPendingAnnouncementData(null);
        }}
        onConfirm={handleSendNotifications}
        title="Notificar nuevo anuncio"
      />
    </div>
  );
}

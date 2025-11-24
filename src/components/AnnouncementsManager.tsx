import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Eye, EyeOff, Image, FileText, X, Upload, Star } from 'lucide-react';
import {
  getAllAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  uploadAnnouncementImage,
  uploadAnnouncementFile,
  type Announcement
} from '../services/announcementDatabase';

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
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string>('');

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const loadAnnouncements = async () => {
    const data = await getAllAnnouncements();
    setAnnouncements(data);
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
    const file = e.target.files?.[0];
    if (file) {
      setAttachmentFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setUploadProgress('Procesando...');

    try {
      let imagen_url = editingId ? announcements.find(a => a.id === editingId)?.imagen_url : undefined;
      let archivo_url = editingId ? announcements.find(a => a.id === editingId)?.archivo_url : undefined;
      let archivo_nombre = editingId ? announcements.find(a => a.id === editingId)?.archivo_nombre : undefined;
      let archivo_tipo = editingId ? announcements.find(a => a.id === editingId)?.archivo_tipo : undefined;

      // Subir imagen si hay una nueva
      if (imageFile) {
        setUploadProgress('Subiendo imagen...');
        imagen_url = await uploadAnnouncementImage(imageFile);
      }

      // Subir archivo adjunto si hay uno nuevo
      if (attachmentFile) {
        setUploadProgress('Subiendo archivo...');
        archivo_url = await uploadAnnouncementFile(attachmentFile);
        archivo_nombre = attachmentFile.name;
        archivo_tipo = attachmentFile.type;
      }

      const announcementData = {
        ...formData,
        imagen_url,
        archivo_url,
        archivo_nombre,
        archivo_tipo,
        fecha_publicacion: new Date().toISOString(),
        autor: 'Administrador', // Puedes cambiarlo por el usuario actual
      };

      if (editingId) {
        await updateAnnouncement(editingId, announcementData);
      } else {
        await createAnnouncement(announcementData);
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
    setAttachmentFile(null);
    setEditingId(null);
    setShowForm(false);
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
                <label className="block text-gray-300 mb-2">Archivo adjunto</label>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white cursor-pointer hover:bg-slate-600">
                    <FileText className="w-5 h-5" />
                    Seleccionar archivo
                    <input
                      type="file"
                      onChange={handleAttachmentChange}
                      className="hidden"
                    />
                  </label>
                  {attachmentFile && <span className="text-green-400 text-sm">{attachmentFile.name}</span>}
                </div>
              </div>
            </div>

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
                  {announcement.archivo_url && (
                    <div className="mt-3 flex items-center gap-2 text-blue-400">
                      <FileText className="w-4 h-4" />
                      <span className="text-sm">{announcement.archivo_nombre}</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2">
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
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { BookOpen, Link as LinkIcon, AlertCircle, Award, FileText, Trash2, Plus, Loader2, Image as ImageIcon, Headphones } from 'lucide-react';
import type { InterinosBibliografiaItem, InterinosCategoria } from '../services/interinosBibliografia';
import {
  getInterinosContenido,
  uploadInterinosBibliografiaFile,
  createInterinosContenidoRecord,
  deleteInterinosContenido,
} from '../services/interinosBibliografia';

interface FormState {
  titulo: string;
  descripcion: string;
  url: string;
  file: File | null;
  loading: boolean;
  error: string | null;
}

const initialFormState: FormState = {
  titulo: '',
  descripcion: '',
  url: '',
  file: null,
  loading: false,
  error: null,
};

const categoriasFormacion: { key: InterinosCategoria; label: string; icon: React.ReactNode }[] = [
  { key: 'formacion_bibliografia', label: 'Bibliografía', icon: <BookOpen className="w-4 h-4" /> },
  { key: 'formacion_curso', label: 'Cursos', icon: <FileText className="w-4 h-4" /> },
  { key: 'formacion_enlace', label: 'Enlaces', icon: <LinkIcon className="w-4 h-4" /> },
];

const categoriasNoticias: { key: InterinosCategoria; label: string; icon: React.ReactNode }[] = [
  { key: 'noticias_destacadas', label: 'Noticias destacadas', icon: <AlertCircle className="w-4 h-4" /> },
];

const categoriasOposiciones: { key: InterinosCategoria; label: string; icon: React.ReactNode }[] = [
  { key: 'oposiciones', label: 'Oposiciones', icon: <Award className="w-4 h-4" /> },
];

function resolveIconForItem(item: InterinosBibliografiaItem) {
  if (item.tipo.startsWith('image/')) return <ImageIcon className="w-4 h-4 text-blue-300" />;
  if (item.tipo.startsWith('audio/')) return <Headphones className="w-4 h-4 text-emerald-300" />;
  if (item.tipo === 'link') return <LinkIcon className="w-4 h-4 text-orange-300" />;
  return <FileText className="w-4 h-4 text-slate-200" />;
}

function buildNombreForLink(titulo: string, url: string): string {
  try {
    const u = new URL(url);
    return `${titulo || 'Enlace'} • ${u.hostname}`;
  } catch {
    return titulo || url;
  }
}

export default function InterinosManager() {
  const [items, setItems] = useState<InterinosBibliografiaItem[]>([]);
  const [loadingGlobal, setLoadingGlobal] = useState(false);
  const [forms, setForms] = useState<Record<string, FormState>>({});

  const loadAll = async () => {
    setLoadingGlobal(true);
    const data = await getInterinosContenido();
    setItems(data);
    setLoadingGlobal(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const ensureFormState = (categoria: InterinosCategoria) => {
    if (!forms[categoria]) {
      setForms((prev) => ({ ...prev, [categoria]: { ...initialFormState } }));
    }
  };

  const updateForm = (categoria: InterinosCategoria, patch: Partial<FormState>) => {
    setForms((prev) => ({
      ...prev,
      [categoria]: {
        ...(prev[categoria] || initialFormState),
        ...patch,
      },
    }));
  };

  const handleSubmit = async (categoria: InterinosCategoria, createdBy: string | null = null) => {
    const form = forms[categoria] || initialFormState;
    if (!form.titulo.trim()) {
      updateForm(categoria, { error: 'El título es obligatorio.' });
      return;
    }

    if (!form.file && !form.url.trim()) {
      updateForm(categoria, { error: 'Debes subir un archivo o indicar un enlace externo.' });
      return;
    }

    updateForm(categoria, { loading: true, error: null });

    try {
      let finalUrl = form.url.trim();
      let nombre = form.titulo.trim();
      let tipo = 'link';

      if (form.file) {
        const uploadedUrl = await uploadInterinosBibliografiaFile(form.file);
        if (!uploadedUrl) {
          updateForm(categoria, { error: 'No se ha podido subir el archivo.', loading: false });
          return;
        }
        finalUrl = uploadedUrl;
        nombre = form.file.name;
        tipo = form.file.type || 'application/octet-stream';
      } else {
        nombre = buildNombreForLink(form.titulo.trim(), finalUrl);
        tipo = 'link';
      }

      const record = await createInterinosContenidoRecord({
        titulo: form.titulo.trim(),
        descripcion: form.descripcion.trim() || undefined,
        url: finalUrl,
        nombre,
        tipo,
        categoria,
        created_by: createdBy,
      });

      if (!record) {
        updateForm(categoria, { error: 'No se ha podido guardar el registro.', loading: false });
        return;
      }

      setItems((prev) => [record, ...prev]);
      updateForm(categoria, { ...initialFormState });
    } catch (err) {
      console.error('Error al guardar contenido de interinos:', err);
      updateForm(categoria, { error: 'Se ha producido un error inesperado.', loading: false });
    }
  };

  const handleDelete = async (item: InterinosBibliografiaItem) => {
	if (!confirm(`¿Eliminar "${item.titulo}" de Interinos?`)) return;
    const ok = await deleteInterinosContenido(item.id);
    if (ok) {
      setItems((prev) => prev.filter((i) => i.id !== item.id));
    } else {
      alert('No se ha podido eliminar el elemento.');
    }
  };

  const renderSection = (title: string, description: string, categorias: { key: InterinosCategoria; label: string; icon: React.ReactNode }[]) => {
    return (
      <div className="bg-slate-900/80 rounded-2xl border border-slate-700/60 p-6 space-y-6">
        <div>
          <h3 className="text-xl font-bold text-white mb-1">{title}</h3>
          <p className="text-sm text-gray-400">{description}</p>
        </div>

        {categorias.map(({ key, label, icon }) => {
          const form = forms[key] || initialFormState;
          const categoryItems = items.filter((i) => i.categoria === key || (key === 'formacion_bibliografia' && i.categoria === 'bibliografia'));

          return (
            <div key={key} className="bg-slate-950/60 rounded-xl border border-slate-800/80 p-4 space-y-4">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-orange-500/10 text-orange-300">
                    {icon}
                  </span>
                  <p className="text-sm font-semibold text-orange-200">{label}</p>
                </div>
                <span className="text-xs text-gray-400">{categoryItems.length} elementos</span>
              </div>

              <div className="grid md:grid-cols-[2fr,1fr] gap-4">
                <div className="space-y-2">
                  {form.error && (
                    <p className="text-[11px] text-red-400">{form.error}</p>
                  )}
                  <input
                    type="text"
                    value={form.titulo}
                    onChange={(e) => updateForm(key, { titulo: e.target.value })}
					placeholder="Título"
                    className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-1.5 text-xs text-gray-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                  <textarea
                    value={form.descripcion}
                    onChange={(e) => updateForm(key, { descripcion: e.target.value })}
					placeholder="Descripción (opcional)"
                    className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-1.5 text-xs text-gray-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-orange-500 min-h-[60px]"
                  />
                  <input
                    type="url"
                    value={form.url}
                    onChange={(e) => updateForm(key, { url: e.target.value })}
                    placeholder="Enlace externo (opcional si subes archivo)"
                    className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-1.5 text-xs text-gray-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                  <input
                    type="file"
                    onChange={(e) => updateForm(key, { file: e.target.files?.[0] || null })}
                    className="w-full text-[11px] text-gray-300 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-[11px] file:font-semibold file:bg-orange-600 file:text-white hover:file:bg-orange-700 cursor-pointer"
                  />
                </div>

                <div className="flex flex-col justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => handleSubmit(key)}
                    disabled={form.loading}
                    className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-gradient-to-r from-orange-500 to-red-600 text-white text-xs font-semibold hover:from-orange-400 hover:to-red-500 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {form.loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
						Añadir a {label}
                      </>
                    )}
                  </button>

                  <div className="text-[11px] text-gray-400">
					<p>Si indicas un enlace sin archivo, se guardará como recurso externo.</p>
					<p>Si subes un archivo, se almacenará en el bucket "public-files".</p>
                  </div>
                </div>
              </div>

              {categoryItems.length > 0 ? (
                <div className="border-t border-slate-800/80 pt-3 mt-1 space-y-2 max-h-48 overflow-y-auto pr-1">
                  {categoryItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-3 text-[11px] bg-slate-900/80 rounded-md px-2 py-1.5 hover:bg-slate-800/80 transition-colors"
                    >
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 flex-1 min-w-0 text-gray-200 hover:text-orange-200"
                      >
                        {resolveIconForItem(item)}
                        <span className="truncate">{item.titulo}</span>
                        <span className="text-[10px] text-gray-500 truncate max-w-[140px]">
                          {item.nombre}
                        </span>
                      </a>
                      <button
                        type="button"
                        onClick={() => handleDelete(item)}
                        className="p-1 rounded text-red-400 hover:bg-red-500/10"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : !loadingGlobal ? (
                <p className="text-[11px] text-gray-500 border-t border-slate-800/80 pt-2 mt-1">
				  Aún no hay elementos en esta categoría.
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Interinos</h2>
          <p className="text-sm text-gray-400">
			Gestiona la información que aparece en el área de Interinos (formación, noticias y oposiciones).
          </p>
        </div>
        {loadingGlobal && (
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            Actualizando datos...
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {renderSection(
		  'Formación',
		  'Bibliografía, cursos y enlaces de utilidad para interinos.',
          categoriasFormacion,
        )}
        {renderSection(
          'Noticias destacadas',
		  'Documentos, enlaces, imágenes o audios relevantes para interinos.',
          categoriasNoticias,
        )}
        {renderSection(
          'Oposiciones',
          'Bases, documentos y enlaces sobre procesos selectivos.',
          categoriasOposiciones,
        )}
      </div>
    </div>
  );
}

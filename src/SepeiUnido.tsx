import React, { useState, useEffect } from 'react';
import { Flame, Users, Shield, Target, Mail, Phone, Instagram, Facebook, Twitter, Linkedin, ChevronDown, CheckCircle, AlertCircle, TrendingUp, Clock, BookOpen, Award, Settings, Menu, X } from 'lucide-react';
import { addUser } from './services/userDatabase';

export default function SepeiUnido() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    instagram: '',
    facebook: '',
    twitter: '',
    linkedin: ''
  });
  const [formStatus, setFormStatus] = useState(null as any);
  const [hoveredRoadmap, setHoveredRoadmap] = useState<number | null>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSubmit = () => {
    if (!formData.nombre || !formData.email) {
      setFormStatus({ type: 'error', message: 'Por favor, completa al menos tu nombre y email' });
      setTimeout(() => setFormStatus(null), 4000);
      return;
    }

    // Guardar en base de datos
    try {
      addUser({
        nombre: formData.nombre,
        email: formData.email,
        telefono: formData.telefono || undefined,
        instagram: formData.instagram || undefined,
        facebook: formData.facebook || undefined,
        twitter: formData.twitter || undefined,
        linkedin: formData.linkedin || undefined,
      });

      console.log('Datos del formulario guardados:', formData);
      
      setFormStatus({ type: 'success', message: '¡Bienvenido a SEPEI UNIDO! Nos pondremos en contacto contigo pronto.' });
      
      setFormData({
        nombre: '',
        email: '',
        telefono: '',
        instagram: '',
        facebook: '',
        twitter: '',
        linkedin: ''
      });
      
      setTimeout(() => setFormStatus(null), 5000);
    } catch (error) {
      console.error('Error al guardar:', error);
      setFormStatus({ type: 'error', message: 'Hubo un error al registrarte. Intenta nuevamente.' });
      setTimeout(() => setFormStatus(null), 4000);
    }
  };

  const handleChange = (e: any) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    setMobileMenuOpen(false);
  };

  const roadmapItems = [
    { 
      icon: TrendingUp, 
      title: "Reclasificación MCB C1", 
      desc: "Reclasificación profesional para MCB C1 y las correspondientes escalas",
      priority: "ALTA"
    },
    { 
      icon: Shield, 
      title: "Seguro de Accidentes", 
      desc: "Mejora urgente de las condiciones del seguro de accidentes",
      priority: "CRÍTICA"
    },
    { 
      icon: Clock, 
      title: "Oposiciones", 
      desc: "Ejecución de oposiciones en tiempo y forma",
      priority: "ALTA"
    },
    { 
      icon: Clock, 
      title: "Implantación Horario", 
      desc: "Establecimiento de horarios adaptados al servicio",
      priority: "MEDIA"
    },
    { 
      icon: BookOpen, 
      title: "Formación y Equipamiento", 
      desc: "Formación para nueva incorporación y renovación de EPIs",
      priority: "ALTA"
    },
    { 
      icon: Users, 
      title: "Mínimos y Máximos", 
      desc: "Plantillas mínimas y máximas para seguridad operativa",
      priority: "CRÍTICA"
    },
    { 
      icon: Award, 
      title: "Recurso Preventivo", 
      desc: "Remuneración del recurso preventivo",
      priority: "MEDIA"
    },
    { 
      icon: Settings, 
      title: "Grupos Especialistas", 
      desc: "Regulación de grupos de especialistas",
      priority: "MEDIA"
    }
  ];

  const stats = [
    { number: "8", label: "Objetivos Prioritarios" },
    { number: "100%", label: "Transparencia" },
    { number: "1", label: "Voz Unida" }
  ];

  return (
    <div className="min-h-screen bg-slate-950">
      <nav className={`fixed top-0 w-full z-50 transition-all duration-500 ${scrolled ? 'bg-slate-900/98 backdrop-blur-xl shadow-2xl' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center space-x-4 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              <div className="relative">
                <Flame className="w-11 h-11 text-orange-500" />
                <div className="absolute inset-0 bg-orange-500 blur-xl opacity-50"></div>
              </div>
              <div>
                <h1 className="text-2xl font-black text-white">SEPEI UNIDO</h1>
                <p className="text-xs text-orange-400 font-semibold">Diputación de Albacete</p>
              </div>
            </div>
            
            <div className="hidden md:flex items-center space-x-8">
              {[
                { name: 'Inicio', id: 'inicio' },
                { name: 'Manifiesto', id: 'manifiesto-section' },
                { name: 'Objetivos', id: 'hoja-ruta-section' },
                { name: 'Únete', id: 'contacto-section' }
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className="text-gray-300 hover:text-orange-400 font-semibold transition-all duration-300"
                >
                  {item.name}
                </button>
              ))}
            </div>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden text-white p-2 hover:bg-white/10 rounded-lg"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden bg-slate-900/98 backdrop-blur-xl border-t border-slate-800">
            <div className="px-4 py-6 space-y-4">
              {[
                { name: 'Inicio', id: 'inicio' },
                { name: 'Manifiesto', id: 'manifiesto-section' },
                { name: 'Objetivos', id: 'hoja-ruta-section' },
                { name: 'Únete', id: 'contacto-section' }
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className="block w-full text-left text-gray-300 hover:text-orange-400 font-semibold py-2"
                >
                  {item.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </nav>

      <section id="inicio" className="relative pt-32 pb-24 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-600/20 via-transparent to-red-600/20"></div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl"></div>
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-6 py-3 bg-orange-500/20 rounded-full border border-orange-500/50 mb-8">
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
              <span className="text-orange-400 font-bold text-sm">MOVIMIENTO ASINDICAL</span>
            </div>
            
            <h1 className="text-6xl md:text-8xl font-black text-white mb-6">
              SEPEI
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500">
                UNIDO
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-300 max-w-4xl mx-auto mb-12">
              La <span className="text-orange-400 font-bold">fuerza</span> de un colectivo que levanta su <span className="text-orange-400 font-bold">voz</span> unida para defender nuestros derechos
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <button
                onClick={() => scrollToSection('manifiesto-section')}
                className="px-10 py-5 bg-gradient-to-r from-orange-500 to-red-600 text-white text-lg font-bold rounded-xl shadow-2xl hover:shadow-orange-500/50 transform hover:scale-105 transition-all flex items-center justify-center gap-2"
              >
                Leer Manifiesto
                <ChevronDown className="w-5 h-5" />
              </button>
              <button
                onClick={() => scrollToSection('contacto-section')}
                className="px-10 py-5 bg-white/5 text-white text-lg font-bold rounded-xl border-2 border-white/20 hover:bg-white/10 transform hover:scale-105 transition-all"
              >
                Únete Ahora
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mt-20">
            {stats.map((stat, idx) => (
              <div key={idx} className="text-center p-8 bg-slate-800/50 rounded-2xl border border-orange-500/20 hover:border-orange-500/50 transition-all">
                <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500 mb-2">
                  {stat.number}
                </div>
                <div className="text-gray-400 font-semibold">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 px-4 bg-slate-900">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black text-white mb-4">Nuestros Pilares</h2>
            <div className="h-1.5 w-32 bg-gradient-to-r from-orange-400 to-red-500 mx-auto rounded-full"></div>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Users, title: "Unidad", desc: "La fuerza está en la unión del colectivo" },
              { icon: Target, title: "Claridad", desc: "Objetivos claros definidos por mayoría" },
              { icon: Shield, title: "Defensa", desc: "Protección de los derechos de todos" }
            ].map((item, idx) => (
              <div key={idx} className="bg-slate-800/80 p-10 rounded-3xl border-2 border-slate-700/50 hover:border-orange-500 transition-all hover:scale-105">
                <div className="w-16 h-16 bg-orange-500/20 rounded-2xl mb-6 flex items-center justify-center">
                  <item.icon className="w-8 h-8 text-orange-400" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">{item.title}</h3>
                <p className="text-gray-300">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="manifiesto-section" className="py-24 px-4 bg-slate-950">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-5xl md:text-6xl font-black text-white mb-6">Nuestro Manifiesto</h2>
            <div className="h-1.5 w-40 bg-gradient-to-r from-orange-400 to-red-500 mx-auto rounded-full"></div>
          </div>

          <div className="bg-slate-800/90 p-10 md:p-14 rounded-3xl border-2 border-orange-500/30">
            <div className="space-y-7 text-gray-200 text-lg text-justify">
              <p className="text-orange-400 font-bold text-2xl mb-8 text-center">
                Tras años de continuas guerras sindicales...
              </p>
              
              <p>
                Se ha perdido la perspectiva de la función de los mismos: <span className="text-orange-400 font-bold">¡la defensa de los derechos de los trabajadores!</span>
              </p>
              
              <p>
                Tanto tiempo empleado en disputas nos ha pasado factura, y el SEPEI que hace años fue un servicio de referencia, ahora rema a contracorriente.
              </p>
              
              <p>
                Años de no realizar una escucha activa han minado la confianza de los bomberos en los sindicatos.
              </p>
              
              <div className="my-10 p-8 bg-orange-500/20 border-l-4 border-orange-500 rounded-r-2xl">
                <p className="text-white font-bold text-xl text-justify">
                  De ahí que nace <span className="text-orange-400 text-2xl">SEPEI UNIDO</span>.
                </p>
              </div>
              
              <p>
                Un movimiento que no cuestiona a ningún sindicato. Recogemos las inquietudes de los bomberos del SEPEI para ponerlas en conocimiento de todos los sindicatos.
              </p>
              
              <div className="my-10 text-center py-8">
                <p className="text-3xl font-black text-white mb-4">
                  Ellos son nuestra <span className="text-orange-400">VOZ</span>
                </p>
                <p className="text-3xl font-black text-white">
                  Nosotros unidos tenemos la <span className="text-red-500">FUERZA</span>
                </p>
              </div>
              
              <p className="text-xl font-semibold text-white">
                UNIDOS nuestra voz suena más fuerte para reivindicar todos nuestros derechos en una hoja de ruta COMÚN.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="hoja-ruta-section" className="py-24 px-4 bg-slate-900">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-black text-white mb-6">Hoja de Ruta</h2>
            <div className="h-1.5 w-40 bg-gradient-to-r from-orange-400 to-red-500 mx-auto rounded-full"></div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {roadmapItems.map((item, idx) => (
              <div
                key={idx}
                onMouseEnter={() => setHoveredRoadmap(idx)}
                onMouseLeave={() => setHoveredRoadmap(null)}
                className={`bg-slate-800/80 p-8 rounded-2xl border-2 transition-all cursor-pointer ${
                  hoveredRoadmap === idx ? 'border-orange-500 shadow-2xl scale-105' : 'border-slate-700/50'
                }`}
              >
                <div className="flex items-start gap-6">
                  <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${
                    hoveredRoadmap === idx ? 'bg-gradient-to-br from-orange-500 to-red-600' : 'bg-orange-500/20'
                  }`}>
                    <item.icon className={`w-8 h-8 ${hoveredRoadmap === idx ? 'text-white' : 'text-orange-400'}`} />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-orange-400 font-black">#{idx + 1}</span>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        item.priority === 'CRÍTICA' ? 'bg-red-500/20 text-red-400' :
                        item.priority === 'ALTA' ? 'bg-orange-500/20 text-orange-400' :
                        'bg-blue-500/20 text-blue-400'
                      }`}>
                        {item.priority}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-3">{item.title}</h3>
                    <p className="text-gray-400">{item.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="contacto-section" className="py-24 px-4 bg-slate-950">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-5xl font-black text-white mb-6">Únete a SEPEI UNIDO</h2>
            <p className="text-xl text-gray-400">Tu voz cuenta, tu participación es fundamental</p>
            <div className="h-1.5 w-40 bg-gradient-to-r from-orange-400 to-red-500 mx-auto rounded-full mt-6"></div>
          </div>

          <div className="bg-slate-800/90 p-10 md:p-12 rounded-3xl border-2 border-orange-500/30">
            <div className="space-y-6">
              <div>
                <label className="block text-white font-semibold mb-3">
                  Nombre Completo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleChange}
                  placeholder="Tu nombre y apellidos"
                  className="w-full px-5 py-4 bg-slate-900/80 border-2 border-slate-700 rounded-xl text-white placeholder-gray-500 focus:border-orange-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-white font-semibold mb-3">
                  Email <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="tu.email@ejemplo.com"
                    className="w-full pl-12 pr-5 py-4 bg-slate-900/80 border-2 border-slate-700 rounded-xl text-white placeholder-gray-500 focus:border-orange-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-white font-semibold mb-3">Teléfono (opcional)</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5" />
                  <input
                    type="tel"
                    name="telefono"
                    value={formData.telefono}
                    onChange={handleChange}
                    placeholder="+34 600 000 000"
                    className="w-full pl-12 pr-5 py-4 bg-slate-900/80 border-2 border-slate-700 rounded-xl text-white placeholder-gray-500 focus:border-orange-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <h3 className="text-white font-semibold mb-4">Redes Sociales (opcionales)</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {[
                    { name: 'instagram', icon: Instagram, placeholder: '@tu_usuario' },
                    { name: 'facebook', icon: Facebook, placeholder: 'Tu perfil' },
                    { name: 'twitter', icon: Twitter, placeholder: '@tu_usuario' },
                    { name: 'linkedin', icon: Linkedin, placeholder: 'Tu perfil' }
                  ].map((social) => (
                    <div key={social.name} className="relative">
                      <social.icon className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5" />
                      <input
                        type="text"
                        name={social.name}
                        value={formData[social.name as keyof typeof formData]}
                        onChange={handleChange}
                        placeholder={social.placeholder}
                        className="w-full pl-12 pr-5 py-3 bg-slate-900/80 border-2 border-slate-700 rounded-xl text-white placeholder-gray-500 focus:border-orange-500 outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {formStatus && (
                <div className={`p-4 rounded-xl border-2 flex items-center gap-3 ${
                  formStatus.type === 'success' ? 'bg-green-500/10 border-green-500/50 text-green-400' : 'bg-red-500/10 border-red-500/50 text-red-400'
                }`}>
                  {formStatus.type === 'success' ? <CheckCircle className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
                  <span className="font-semibold">{formStatus.message}</span>
                </div>
              )}

              <button
                onClick={handleSubmit}
                className="w-full py-5 bg-gradient-to-r from-orange-500 to-red-600 text-white text-lg font-bold rounded-xl shadow-2xl hover:shadow-orange-500/50 transform hover:scale-105 transition-all flex items-center justify-center gap-3"
              >
                <Users className="w-6 h-6" />
                Unirme a SEPEI UNIDO
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-4 bg-gradient-to-br from-orange-600 to-red-700">
        <div className="max-w-4xl mx-auto text-center">
          <Users className="w-20 h-20 text-white mx-auto mb-6" />
          <h2 className="text-4xl md:text-5xl font-black text-white mb-6">
            La Fuerza Está en la Unión
          </h2>
          <p className="text-2xl text-orange-100 mb-8 font-semibold">
            Juntos definimos nuestro futuro. Unidos somos más fuertes.
          </p>
        </div>
      </section>

      <footer className="bg-slate-900 py-8 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Flame className="w-8 h-8 text-orange-500" />
            <span className="text-xl font-bold text-white">SEPEI UNIDO</span>
          </div>
          <p className="text-gray-400">Movimiento Asindical - Bomberos Diputación de Albacete</p>
          <p className="text-gray-500 text-sm mt-2">Unidos por nuestros derechos</p>
        </div>
      </footer>
    </div>
  );
}

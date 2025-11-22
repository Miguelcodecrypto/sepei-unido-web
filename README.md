# SEPEI UNIDO - Web Platform

Plataforma web moderna para el movimiento asindical **SEPEI UNIDO** de la Diputación de Albacete. Una voz unida para defender los derechos de los bomberos.

## 🔥 Características

- **Página Principal Profesional**: Manifiesto, objetivos y formulario de registro
- **Base de Datos de Usuarios**: Almacenamiento de datos de usuarios registrados
- **Panel de Administración**: Gestión completa de usuarios con autenticación
- **Autenticación Segura**: Acceso protegido por contraseña con sesiones
- **Exportación de Datos**: Descarga de usuarios en formato CSV
- **Diseño Responsivo**: Totalmente adaptado para mobile, tablet y desktop
- **Tailwind CSS**: Interfaz moderna con gradientes y animaciones

## 🚀 Inicio Rápido

### Requisitos
- Node.js (v16+)
- npm o yarn

### Instalación

```bash
# Clonar repositorio
git clone https://github.com/Miguelcodecrypto/sepei-unido-web.git
cd sepei-unido-web

# Instalar dependencias
npm install

# Arrancar servidor de desarrollo
npm run dev
```

La aplicación estará disponible en: **http://localhost:5173/**

## 📋 Estructura del Proyecto

```
src/
├── components/
│   ├── AdminPanel.tsx          # Panel de administración
│   └── LoginPanel.tsx          # Pantalla de login
├── services/
│   ├── userDatabase.ts         # CRUD de usuarios (localStorage)
│   └── authService.ts          # Autenticación y sesiones
├── App.tsx                     # Componente principal
├── SepeiUnido.tsx              # Página de inicio
├── main.tsx                    # Punto de entrada
└── index.css                   # Estilos globales
```

## 🔐 Panel de Administración

### Acceso
1. Haz clic en el botón ⚙️ (abajo a la derecha)
2. Ingresa la contraseña: **`sepei2024`**
3. Accederás al panel de administración

### Funcionalidades
- 📊 Ver todos los usuarios registrados
- 👁️ Expandir detalles de redes sociales
- 📥 Exportar usuarios a CSV
- 🗑️ Eliminar usuarios individuales
- 🚪 Cerrar sesión (sesión expira en 24h)

## 📝 Formulario de Registro

El formulario recoge:
- **Obligatorio**: Nombre completo y email
- **Opcional**: Teléfono, Instagram, Facebook, Twitter, LinkedIn

Todos los datos se guardan automáticamente en localStorage.

## 🛠️ Tecnologías

- **React 18** - Librería UI
- **TypeScript** - Tipado estático
- **Vite** - Bundler ultrarrápido
- **Tailwind CSS** - Framework de estilos
- **Lucide React** - Iconos profesionales

## 📦 Scripts Disponibles

```bash
# Desarrollo
npm run dev

# Build para producción
npm run build

# Preview del build
npm run preview
```

## 💾 Almacenamiento de Datos

Actualmente, los datos se guardan en **localStorage** del navegador. Para producción, se recomienda:

- **Backend Node.js + Express**: API REST con base de datos
- **Firebase/Supabase**: Base de datos en la nube
- **MongoDB**: Base de datos NoSQL
- **PostgreSQL**: Base de datos relacional

## 🔒 Seguridad

- Contraseña por defecto: `sepei2024` (cambiar en producción)
- Sesiones con expiración de 24 horas
- Datos almacenados en localStorage (local, no sincronizado)

## 📱 Responsividad

La aplicación está completamente optimizada para:
- 📱 Dispositivos móviles (320px+)
- 📲 Tablets (768px+)
- 🖥️ Desktops (1024px+)

## 🌐 Despliegue

### GitHub Pages (Configurado)

El sitio se despliega automáticamente en GitHub Pages cuando se hace push a la rama `main`.

**URL del sitio**: https://miguelcodecrypto.github.io/sepei-unido-web/

El workflow de GitHub Actions:
- ✅ Se ejecuta automáticamente en cada push a `main`
- ✅ Construye el proyecto con Vite
- ✅ Despliega los archivos estáticos a GitHub Pages

Para activar GitHub Pages por primera vez:
1. Ve a **Settings** → **Pages** en el repositorio
2. En **Source**, selecciona **GitHub Actions**
3. El próximo push a `main` desplegará el sitio automáticamente

### Otras Opciones:
- **Vercel**: `vercel deploy`
- **Netlify**: `netlify deploy`

## 📄 Licencia

Este proyecto es privado para SEPEI UNIDO.

## 👥 Autor

Desarrollado por Miguel Ángel - Movimiento SEPEI UNIDO

---

**SEPEI UNIDO** - *La fuerza está en la unión* 🔥

Para más información: https://github.com/Miguelcodecrypto/sepei-unido-web

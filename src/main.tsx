import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { NotificationProvider } from './components/ui/NotificationProvider'
import './index.css'

const root = createRoot(document.getElementById('root')!)
root.render(
  <React.StrictMode>
    <NotificationProvider>
      <App />
    </NotificationProvider>
  </React.StrictMode>
)

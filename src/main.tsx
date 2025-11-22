import React from 'react'
import { createRoot } from 'react-dom/client'
import SepeiUnido from './SepeiUnido'

const root = createRoot(document.getElementById('root')!)
root.render(
  <React.StrictMode>
    <SepeiUnido />
  </React.StrictMode>
)

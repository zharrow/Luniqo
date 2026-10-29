import '@/styles/index.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { App } from '@/app/app'

const root = document.getElementById('root')
if (root === null) throw new Error('Élément #root absent de index.html')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

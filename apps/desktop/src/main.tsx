import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import { TrayWidget } from './components/TrayWidget'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

const isTray = new URLSearchParams(window.location.search).get('tray') === '1'

if (isTray) {
  document.documentElement.style.background = 'transparent'
  document.body.style.background = 'transparent'
  document.documentElement.style.margin = '0'
  document.body.style.margin = '0'
  document.body.style.overflow = 'hidden'
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      {isTray ? <TrayWidget /> : <App />}
    </QueryClientProvider>
  </React.StrictMode>
)

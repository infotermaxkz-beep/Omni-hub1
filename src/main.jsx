import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import TVDisplay from './TVDisplay'

const isTV = window.location.pathname.startsWith('/tv');

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {isTV ? <TVDisplay /> : <App />}
  </React.StrictMode>
)

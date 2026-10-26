import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

// ავტომატური ვერსიის კონტროლი, რათა განახლებისას ბრაუზერმა მყისიერად ჩატვირთოს ახალი ვერსია
const APP_VERSION = "2.6.0-" + Date.now();
try {
  const savedVersion = localStorage.getItem('geostore_app_version');
  if (savedVersion !== APP_VERSION) {
    localStorage.setItem('geostore_app_version', APP_VERSION);
  }
} catch (error) {
  console.error("Version control error:", error);
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

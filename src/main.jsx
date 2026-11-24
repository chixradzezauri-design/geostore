import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
// Exact legacy tail extracted in its original stylesheet position.
import './responsiveCompatibility.css'
import './adminCssSlotStart.css'
import './adminDashboard.css'
import './adminDashboardSections.css'
import './adminDashboardModals.css'
import './adminDashboardPolish.css'
import './adminCssSlotEnd.css'
// Incremental GEOSTORE Design System 2.0 refinements, ordered after legacy styles.
import './designSystemV2.css'
// Video-audited compact phone admin layout after all legacy visual layers.
import './videoAuditMobileAdmin.css'
import './storefrontVideoRedesign.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

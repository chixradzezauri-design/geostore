import React from 'react';
import {systemMonitor} from '../utils/systemMonitor.js';
// Last-resort fallback only; existing per-section boundaries stay in place.
export default class RootErrorBoundary extends React.Component{
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true};}
 componentDidCatch(){try{systemMonitor.record('react_root_render_error');}catch{}}
 render(){
  if(!this.state.failed)return this.props.children;
  return <main role="alert" className="mx-auto my-12 max-w-md space-y-4 rounded-xl border border-slate-700 p-5 text-center">
    <h1 className="text-lg font-bold">GEOSTORE</h1>
    <p>ტექნიკური შეცდომა დაფიქსირდა. გთხოვთ, სცადოთ ხელახლა.</p>
    <button type="button" className="rounded-xl bg-amber-400 px-4 py-3 font-bold text-slate-950" onClick={()=>window.location.reload()}>ხელახლა ცდა</button>
  </main>;
 }
}

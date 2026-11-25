// Opt-in only. No immediate or catch-up burst; stop on panel unmount.
export const HISTORY_REFRESH_INTERVAL=120000;
export function startSystemHistoryRefresh({refresh,visible,setTimer=setInterval,clearTimer=clearInterval}){
 let active=true,busy=false;
 const timer=setTimer(async()=>{
  if(!active||busy||!visible())return;
  busy=true;
  try{await refresh();}catch{/* The panel renders its own unavailable state. */}
  finally{busy=false;}
 },HISTORY_REFRESH_INTERVAL);
 return ()=>{active=false;clearTimer(timer);};
}

import React,{useState,useRef,useMemo} from 'react';
import {createRoot} from 'react-dom/client';
import SystemMonitoringPanel from '../../src/components/SystemMonitoringPanel.jsx';
import {createSystemHistoryReader} from '../../src/utils/systemHistory.js';
import '../../src/index.css';
const owner='1060de3d-d28a-45f8-9a64-5e0368cffc4b';
function Fixture(){
 const [enabled,setEnabled]=useState(true),[calls,setCalls]=useState(0),[waiting,setWaiting]=useState(false);
 const scope=useRef({ownerId:owner,isOwner:true,epoch:1}),hold=useRef(false),pending=useRef(null);
 const read=useMemo(()=>createSystemHistoryReader({enabled:true,getContext:()=>scope.current,client:{
 auth:{getUser:async()=>({data:{user:{id:owner,app_metadata:{role:'admin'}}}}),mfa:{getAuthenticatorAssuranceLevel:async()=>({data:{currentLevel:'aal2',nextLevel:'aal2'}})}},
 rpc:async()=>{setCalls(n=>n+1);const hour=Math.floor(Date.now()/3600000)*3600000;const data=Array.from({length:21},(_,i)=>({hour_at:new Date(hour-i*3600000).toISOString(),code:'catalogue_render_error',observations:4}));if(hold.current){setWaiting(true);await new Promise(r=>{pending.current=r;});setWaiting(false);}return {data};}
 }}),[]);
 return <main><button type="button" onClick={()=>{scope.current={ownerId:owner,isOwner:!enabled,epoch:scope.current.epoch+1};setEnabled(!enabled);}}>Toggle access</button><button type="button" onClick={()=>{hold.current=true;}}>Hold next response</button><button type="button" onClick={()=>{hold.current=false;pending.current?.();}}>Release response</button><output data-testid="calls">{calls}</output><output data-testid="waiting">{String(waiting)}</output>
 <SystemMonitoringPanel enabled={enabled} read={read} lang="en"/></main>;
}
createRoot(document.getElementById('root')).render(<Fixture/>);

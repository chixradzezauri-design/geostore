// Browser fixture only, never a production entry point. No live SDK/network.
import React,{useMemo,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import AdminMfaPanel from '../../src/components/AdminMfaPanel.jsx';
import {createAdminMfaTransport} from '../../src/utils/adminMfaTransport.js';
import {createAdminMfaAccessResolver} from '../../src/utils/adminMfaAccessResolver.js';
import {createAdminAuthCoordinator} from '../../src/utils/adminAuthCoordinator.js';
import {OWNER_ADMIN_ACCESS} from '../../src/utils/adminAccess.js';
const A='1060de3d-d28a-45f8-9a64-5e0368cffc4b',B='00000000-0000-4000-8000-000000000002',F='00000000-0000-4000-8000-000000000003',C='00000000-0000-4000-8000-000000000004';
function Fixture(){
 const [identity,setIdentity]=useState({ownerId:A,epoch:1}),[status,setStatus]=useState('pending');
 const context=useRef({...identity,authLoading:false,adminEligible:true});
 const level=useRef('aal1');
 const coordinator=useMemo(()=>createAdminAuthCoordinator({locks:navigator.locks}),[]);
 const client=useMemo(()=>({auth:{getUser:async()=>({data:{user:{id:context.current.ownerId,app_metadata:{role:'admin'}}}}),mfa:{
 getAuthenticatorAssuranceLevel:async()=>({data:{currentLevel:level.current,nextLevel:'aal2'}}),
 listFactors:async()=>({data:{totp:[{id:F,status:'verified',friendly_name:'Fixture device'}]}}),
 challenge:async()=>({data:{id:C}}),
 verify:async({code})=>{if(code!=='012345')return {error:{message:'fixture invalid code'}};level.current='aal2';return {data:{}};}
 }},rpc:async name=>({data:name==='admin_mfa_eligible'?context.current.ownerId===A:level.current==='aal2'?OWNER_ADMIN_ACCESS:null})}),[]);
 const options={enabled:true,client,getContext:()=>context.current,runAuthExclusive:coordinator};
 const transport=useMemo(()=>createAdminMfaTransport(options),[]);
 const resolve=useMemo(()=>createAdminMfaAccessResolver(options),[]);
 async function recheck(){const r=await resolve();setStatus(r.status);}
 function switchAccount(){
  const next={ownerId:B,epoch:context.current.epoch+1};
  context.current={...next,authLoading:false,adminEligible:false};transport.forgetEnrollment();level.current='aal1';
  setIdentity(next);setStatus('signed-out');
 }
 return <main><button type="button" onClick={switchAccount}>Switch fixture account</button><output data-testid="access">{status}</output>
 {identity.ownerId===A&&status!=='authorized'&&<AdminMfaPanel enabled transport={transport} ownerId={identity.ownerId} epoch={identity.epoch} lang="en" onRecheck={recheck} onSignOut={switchAccount}/>}
 {status==='authorized'&&identity.ownerId===A&&<section data-testid="protected-fixture">Authorized fixture only</section>}</main>;
}
createRoot(document.getElementById('root')).render(<Fixture/>);

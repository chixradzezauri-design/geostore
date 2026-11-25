import React from 'react';
import {getCustomerSyncStatus} from '../utils/customerSyncStatus.js';

// Presentational only; mount when the synchronization feature is release-approved.
export default function CustomerSyncStatus({status='disabled',lang='ka'}){
 const info=getCustomerSyncStatus(status,lang);
 return <p role="status" aria-live="polite" className={`text-xs break-words ${info.attention?'text-amber-600':'text-slate-500'}`}>{info.text}</p>;
}

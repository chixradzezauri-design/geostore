import React,{useEffect,useState} from 'react';
import {subscribePwaStatus} from '../utils/pwaStatus.js';
const copy={
 ka:{offline:'ინტერნეტთან კავშირი დაკარგულია. კავშირის აღდგენამდე მოერიდეთ შეკვეთის ან ცვლილებების გაგზავნას.',update:'GEOSTORE-ის ახალი ვერსია მზად არის. სამუშაოს დასრულების შემდეგ დახურეთ ყველა GEOSTORE-ის ფანჯარა და ხელახლა გახსენით.'},
 en:{offline:'You appear to be offline. Avoid submitting orders or changes until your connection returns.',update:'A new GEOSTORE version is ready. Finish your work, then close all GEOSTORE windows and reopen.'},
 ru:{offline:'Похоже, интернет отключён. Не отправляйте заказы или изменения до восстановления связи.',update:'Новая версия GEOSTORE готова. Завершите работу, закройте все окна GEOSTORE и откройте снова.'}
};
export default function PwaStatusNotice({lang='ka'}){
 const [status,setStatus]=useState({offline:false,updateWaiting:false});
 useEffect(()=>subscribePwaStatus(window,setStatus),[]);
 const t=copy[lang]||copy.ka;
 if(!status.offline&&!status.updateWaiting)return null;
 return <div className="mx-auto max-w-[1440px] px-4 pt-2 sm:px-6" role="status" aria-live="polite">
 <p className="rounded-xl border border-amber-500/40 bg-amber-50 px-3 py-2 text-xs leading-5 text-stone-900">{status.offline?t.offline:t.update}</p>
 </div>;
}

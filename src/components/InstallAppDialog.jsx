import React,{useEffect,useRef} from 'react';
const copy={
 ka:{title:'GEOSTORE-ის დაყენება',close:'დახურვა',done:'გასაგებია',installed:'აპლიკაცია უკვე დაყენებულია.',ios:['გახსენით საიტი Safari-ში.','დააჭირეთ გაზიარების ღილაკს (Share).','აირჩიეთ „Add to Home Screen“ და დაადასტურეთ. თუ ხელმისაწვდომია, ჩართეთ Open as Web App.'],android:['გახსენით საიტი Chrome-ში.','დააჭირეთ სამწერტილიან მენიუს.','აირჩიეთ Install app ან Add to Home screen.'],desktop:['გახსენით ბრაუზერის მენიუ.','მოძებნეთ Install app ან მისამართის ზოლში დაყენების ხატულა.'],note:'თუ დაყენების არჩევანი არ ჩანს, გამოიყენეთ მხარდაჭერილი ბრაუზერი. ინტერნეტი საჭიროა შეკვეთებისთვის.'},
 en:{title:'Install GEOSTORE',close:'Close',done:'Got it',installed:'The app is already installed.',ios:['Open this site in Safari.','Tap Share.','Choose Add to Home Screen and confirm. Enable Open as Web App if available.'],android:['Open this site in Chrome.','Tap the three-dot menu.','Choose Install app or Add to Home screen.'],desktop:['Open the browser menu.','Look for Install app or the install icon in the address bar.'],note:'If installation is unavailable, use a supported browser. Orders require an internet connection.'},
 ru:{title:'Установить GEOSTORE',close:'Закрыть',done:'Понятно',installed:'Приложение уже установлено.',ios:['Откройте сайт в Safari.','Нажмите «Поделиться».','Выберите «На экран Домой» и подтвердите. Включите Open as Web App, если доступно.'],android:['Откройте сайт в Chrome.','Нажмите меню с тремя точками.','Выберите «Установить приложение» или «Добавить на главный экран».'],desktop:['Откройте меню браузера.','Найдите пункт установки приложения или значок в адресной строке.'],note:'Если установка недоступна, используйте поддерживаемый браузер. Для заказов нужен интернет.'}
};
export default function InstallAppDialog({platform,installed,lang,onClose}){
 const t=copy[lang]||copy.ka;
 const dialog=useRef(null);
 useEffect(()=>{
  const el=dialog.current;if(!el)return;
  const previous=document.activeElement;
  if(typeof el.showModal==='function'&&!el.open)el.showModal();
  else el.setAttribute('open','');
  return ()=>{if(el.open&&typeof el.close==='function')el.close();if(previous?.isConnected)previous.focus();};
 },[]);
 return <dialog ref={dialog} aria-labelledby="install-app-title" onCancel={e=>{e.preventDefault();onClose();}} className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-sm max-h-[85dvh] overflow-y-auto rounded-2xl border border-stone-200 bg-white p-5 text-stone-900 shadow-2xl backdrop:bg-black/60">
 <div className="flex items-center gap-3"><img src="/icons/geostore-192.png" width="48" height="48" alt="" className="rounded-xl"/><h2 id="install-app-title" className="text-base font-bold flex-1">{t.title}</h2><button type="button" aria-label={t.close} onClick={onClose} className="min-w-11 min-h-11 rounded-lg border border-stone-200">✕</button></div>
 {installed?<p className="mt-4 text-sm">{t.installed}</p>:<><ol className="mt-4 list-decimal pl-5 space-y-2 text-sm leading-6">{(t[platform]||t.desktop).map(s=><li key={s}>{s}</li>)}</ol><p className="mt-4 text-xs leading-5 text-stone-600">{t.note}</p></>}
 <button type="button" onClick={onClose} className="mt-5 min-h-11 w-full rounded-xl bg-stone-900 px-4 py-3 text-sm font-semibold text-white">{t.done}</button>
 </dialog>;
}

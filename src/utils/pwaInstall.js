export function getInstallPlatform(nav={}){
 const ua=String(nav.userAgent||'');
 if(/iPhone|iPad|iPod/i.test(ua)||(/Mac/i.test(String(nav.platform||''))&&Number(nav.maxTouchPoints)>1))return 'ios';
 if(/Android/i.test(ua))return 'android';
 return 'desktop';
}
export function isStandaloneApp(target){
 try{return target?.navigator?.standalone===true||target?.matchMedia?.('(display-mode: standalone)')?.matches===true;}
 catch{return false;}
}

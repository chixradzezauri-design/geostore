// Passwords are handled exclusively by the existing Auth call and the native
// credential manager; never persist them in localStorage, cookies or app state.
export function readLoginFields(form,fallback={}){
 const fields=form?.elements;
 const email=fields?.namedItem?.('username')?.value;
 const password=fields?.namedItem?.('password')?.value;
 return {email:String(email??fallback.email??'').trim().toLowerCase(),password:String(password??fallback.password??''),offerSave:fields?.namedItem?.('offerPasswordSave')?.checked===true};
}
export function supportsBrowserPasswordSave(browser){
 return !!(browser?.isSecureContext&&typeof browser.PasswordCredential==='function'&&typeof browser.navigator?.credentials?.store==='function');
}
export async function offerBrowserPasswordSave(browser,{email,password}={}){
 if(!supportsBrowserPasswordSave(browser)||!email||!password)return false;
 try{
  const credential=new browser.PasswordCredential({id:email,password});
  await browser.navigator.credentials.store(credential);
  return true;
 }catch{return false;}
}

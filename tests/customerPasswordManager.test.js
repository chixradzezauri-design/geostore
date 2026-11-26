import test from 'node:test';
import assert from 'node:assert/strict';
import {readLoginFields,supportsBrowserPasswordSave,offerBrowserPasswordSave} from '../src/utils/customerPasswordManager.js';
import {readFileSync} from 'node:fs';
test('native autofill values take precedence over stale React login state',()=>{
 const fields={username:{value:' USER@EXAMPLE.COM '},password:{value:'native value'},offerPasswordSave:{checked:true}};
 assert.deepEqual(readLoginFields({elements:{namedItem:key=>fields[key]}},{email:'old',password:'old'}),{email:'user@example.com',password:'native value',offerSave:true});
 assert.equal(readLoginFields(null,{email:'a@b.c',password:'x'}).offerSave,false);
});
test('native password save fails safely on unsupported and cancelled platforms',async()=>{
 assert.equal(supportsBrowserPasswordSave(null),false);
 assert.equal(await offerBrowserPasswordSave({}, {email:'a@b.c',password:'example'}),false);
 const browser={isSecureContext:true,PasswordCredential:class{constructor(data){this.data=data}},navigator:{credentials:{store:async()=>{throw Error('cancelled')}}}};
 assert.equal(await offerBrowserPasswordSave(browser,{email:'a@b.c',password:'example'}),false);
 let captured;browser.navigator.credentials.store=async c=>{captured=c.data};
 assert.equal(await offerBrowserPasswordSave(browser,{email:'a@b.c',password:'example'}),true);
 assert.equal(captured.id,'a@b.c');
});
test('save option only follows a confirmed password sign-in',()=>{
 const app=readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8');
 const modal=readFileSync(new URL('../src/components/Modals.jsx',import.meta.url),'utf8');
 assert.ok(app.indexOf('if (!data.session || !data.user)')<app.indexOf('if (loginFields?.offerSave)'));
 assert.ok(modal.includes('name="username"'));
 assert.ok(modal.includes('name="password"'));
 assert.ok(modal.includes('current-password'));
});

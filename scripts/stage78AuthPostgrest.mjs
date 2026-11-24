// CI-only: actual Supabase Auth sign-in JWTs plus PostgREST HTTP requests.
// Never point this script at a remotely hosted API. All identities are synthetic.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';

const {API_URL, ANON_KEY, SERVICE_ROLE_KEY} = process.env;
assert.ok(API_URL && ANON_KEY && SERVICE_ROLE_KEY, 'Missing local Supabase status environment');
const target = new URL(API_URL);
assert.ok(['127.0.0.1', 'localhost'].includes(target.hostname), 'Refusing non-local Supabase API');
assert.equal(target.protocol, 'http:', 'Stage78 must only call the ephemeral local Supabase API');

const options = {auth: {persistSession: false, autoRefreshToken: false, detectSessionInUrl: false}};
const privileged = createClient(API_URL, SERVICE_ROLE_KEY, options);
const anonymous = createClient(API_URL, ANON_KEY, options);
let checks = 0;
function pass(value, label) { assert.ok(value, label); checks++; }
function noError(result, label) { assert.equal(result.error, null, label + ': ' + (result.error?.message || '')); checks++; return result.data; }
function blocked(result, label) { pass(result.error !== null && result.error !== undefined, label); }
function authed(token) {
  return createClient(API_URL, ANON_KEY, {...options, global: {headers: {Authorization: 'Bearer ' + token}}});
}

async function createIdentity(name) {
  const email = 'stage78-' + name + '-' + randomUUID().slice(0, 8) + '@example.test';
  const password = 'Ci-only-A7!' + randomUUID();
  const created = await privileged.auth.admin.createUser({email, password, email_confirm: true});
  const identity = noError(created, 'Auth admin creates synthetic ' + name);
  pass(Boolean(identity.user?.id), 'Auth user id present for ' + name);
  const signin = await createClient(API_URL, ANON_KEY, options).auth.signInWithPassword({email, password});
  const session = noError(signin, 'GoTrue password sign-in for ' + name);
  pass(Boolean(session.session?.access_token), 'Real signed access token for ' + name);
  return {id: identity.user.id, email, password, token: session.session.access_token};
}

async function grant(user, permissions, isActive=true) {
  noError(await privileged.from('admin_staff_members').insert({
    user_id: user.id, email: user.email, display_name: 'CI ' + user.email.split('-')[1],
    role: 'operator', permissions, is_active: isActive
  }), 'Trusted CI service role stores permission grant');
}
async function orders(client) { return client.from('orders').select('*').eq('id','STAGE78-ORDER'); }
async function page(client) { return client.rpc('admin_order_ledger_page', {p_offset:0,p_limit:10}); }

const [noStaff, products, orderStaff, finance, inactive] = await Promise.all(
  ['nonstaff','products','orders','finance','inactive'].map(createIdentity)
);
await grant(products, {products:true});
await grant(orderStaff, {orders:true});
await grant(finance, {orders:true, expenses:true});
await grant(inactive, {orders:true}, false);

blocked(await orders(anonymous), 'Guest cannot query private orders via PostgREST');
blocked(await page(anonymous), 'Guest cannot call privileged projected order RPC');
pass(noError(await orders(authed(noStaff.token)), 'No-grant caller RLS query').length === 0,
  'Signed but unauthorized user sees zero orders');
blocked(await page(authed(noStaff.token)), 'Signed but unauthorized caller denied projected RPC');

const spoofClient = createClient(API_URL, ANON_KEY, options);
noError(await spoofClient.auth.signInWithPassword({email:noStaff.email,password:noStaff.password}),
  'Sign in for attacker user_metadata test');
noError(await spoofClient.auth.updateUser({data:{role:'admin', is_admin:true}}),
  'Untrusted user_metadata update is allowed but must never authorize access');
const spoofToken = noError(await spoofClient.auth.getSession(), 'Read spoof caller session').session?.access_token;
pass(Boolean(spoofToken), 'Spoof user retains real signed token');
blocked(await page(authed(spoofToken)), 'User-editable metadata cannot grant order permission');

const productApi=authed(products.token);
pass(noError(await orders(productApi), 'Products-only RLS').length === 0,
  'Products-only role cannot read order records');
blocked(await page(productApi), 'Products-only role denied orders ledger');
const refs=noError(await productApi.rpc('admin_order_image_refs_page',{p_offset:0,p_limit:10}),
  'Products-only authorized image reference RPC');
pass(Array.isArray(refs) && refs.length===1, 'Products-only image scan returns one synthetic row');
pass(Object.keys(refs[0]).join(',')==='items', 'Image RPC never exposes order fields');
pass(refs[0].items[0].image==='ci-image.png', 'Image reference returned');
pass(!('vendor' in refs[0].items[0]) && !('purchase_cost' in refs[0].items[0]),
  'Image reference contains no finance details');

const orderApi=authed(orderStaff.token);
pass(noError(await orders(orderApi), 'Phase A old client order query').length===1,
  'Phase A intentionally keeps old orders-only reads compatible');
const projected=noError(await page(orderApi), 'Orders-only projected RPC');
pass(projected.length===1, 'Orders-only projected order count');
pass(projected[0].items[0].price===140, 'Orders-only retains operational item price');
pass(!('purchase_cost' in projected[0].items[0]) && !('vendor' in projected[0].items[0]),
  'Orders-only projected RPC redacts purchase cost/vendor');
pass(!('internal_vendor' in projected[0].checkout_result) &&
  !('private_note' in projected[0].checkout_request) &&
  !('items' in projected[0].checkout_result),
  'Orders-only projected RPC drops private checkout snapshots');
const financePage=noError(await page(authed(finance.token)), 'Orders+finance projected RPC');
pass(financePage[0].items[0].purchase_cost===40 &&
  financePage[0].items[0].vendor==='private-ci-vendor',
  'Finance-granted role retains protected cost data');

blocked(await authed(orderStaff.token).from('admin_staff_members').select('*'),
  'Signed staff cannot query staff permission records');
blocked(await authed(noStaff.token).from('admin_staff_members').insert({
  user_id: noStaff.id,email:noStaff.email,display_name:'Forbidden',role:'manager',permissions:{orders:true}
}), 'Client cannot self-assign staff privileges');

pass(noError(await orders(authed(inactive.token)), 'Inactive staff RLS query').length===0,
  'Inactive staff sees no orders');
blocked(await page(authed(inactive.token)), 'Inactive staff denied protected RPC');

const badTokenParts = orderStaff.token.split('.');
pass(badTokenParts.length===3, 'Signed JWT has three segments');
const signature = badTokenParts[2];
badTokenParts[2] = (signature[0] === 'A' ? 'B' : 'A') + signature.slice(1);
const invalid = await fetch(API_URL + '/rest/v1/orders?select=id', {
  headers:{apikey:ANON_KEY, Authorization:'Bearer ' + badTokenParts.join('.')}
});
pass(invalid.status === 401 || invalid.status === 403, 'Tampered JWT rejected by PostgREST gateway');

noError(await privileged.from('admin_staff_members').update({is_active:false}).eq('user_id',orderStaff.id),
  'Trusted role deactivates staff without changing Auth account');
blocked(await page(authed(orderStaff.token)),
  'Existing valid signed JWT does not override server-side staff revocation');

console.log('PASS Stage78: ' + checks + ' real local Auth/PostgREST/RLS checks. No live project contacted.');

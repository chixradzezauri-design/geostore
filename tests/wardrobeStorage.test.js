import test from 'node:test';
import assert from 'node:assert/strict';
import {wardrobeStorageKey,readWardrobe,writeWardrobe,readCurrentWardrobe} from '../src/utils/wardrobeStorage.js';
function fixture(){const map=new Map();return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};}
test('wardrobe account A, account B and guest remain separate; legacy untouched',()=>{
 const storage=fixture(),legacy=JSON.stringify([{id:'old',name:'private old photo'}]);
 storage.setItem('geostore_digital_wardrobe',legacy);
 const a=[{id:'a',name:'A photo',image:'data:image/png;base64,fixture'}],b=[{id:'b',name:'B photo'}];
 writeWardrobe(storage,'A',a);writeWardrobe(storage,'B',b);writeWardrobe(storage,null,[]);
 assert.deepEqual(readWardrobe(storage,'A'),a);
 assert.deepEqual(readWardrobe(storage,'B'),b);
 assert.deepEqual(readWardrobe(storage,null),[]);
 assert.equal(readWardrobe(storage,'C').some(x=>x.id==='old'),false);
 assert.equal(storage.getItem('geostore_digital_wardrobe'),legacy);
 assert.notEqual(wardrobeStorageKey('guest'),wardrobeStorageKey(null));
});
test('corrupted scoped snapshots fail closed and storage write errors propagate',()=>{
 const storage=fixture();storage.setItem(wardrobeStorageKey('A'),'{');
 assert.deepEqual(readWardrobe(storage,'A'),[]);
 assert.throws(()=>writeWardrobe({setItem(){throw Error('quota')}},'A',[]),/quota/);
});

test('blocked localStorage getter fails closed',()=>{
 assert.deepEqual(readCurrentWardrobe('A',()=>{throw Error('SecurityError')}),[]);
 const storage=fixture();writeWardrobe(storage,'A',[{id:'a',name:'A'}]);
 assert.deepEqual(readCurrentWardrobe('A',()=>storage),[{id:'a',name:'A'}]);
});

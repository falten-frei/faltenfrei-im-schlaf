import test from 'node:test';
import assert from 'node:assert/strict';
import worker, {OWNER_EMAIL, customerReceipt, validate} from '../backend/worker.js';

const payload={kind:'order',requestId:'12345678-1234-4123-a123-123456789abc',language:'ru',trade:true,terms:true,customer:{firstName:'Test',lastName:'Salon',email:'buyer@example.com',phone:'+49301234567',salon:'Institut',street:'Test 1',postal:'10115',city:'Berlin',country:'DE'},items:[{id:'pw-touch',quantity:4}]};
function database(){
 const requests=new Map(),counters=new Map();
 return {requests,prepare(sql){let args=[];return {bind(...v){args=v;return this},async first(){return sql.includes('FROM requests')?requests.get(args[0]):{hits:counters.get(args[0])||0}},async run(){
  if(sql.startsWith('INSERT INTO rate_limit'))counters.set(args[0],(counters.get(args[0])||0)+1);
  if(sql.startsWith('INSERT OR IGNORE INTO requests')&&!requests.has(args[0]))requests.set(args[0],{fingerprint:args[1],owner_sent:0,customer_sent:0});
  if(sql.startsWith('UPDATE requests SET owner_sent'))requests.get(args[0]).owner_sent=1;
  if(sql.startsWith('UPDATE requests SET customer_sent'))requests.get(args[0]).customer_sent=1;
  return {success:true};
 }}}};
}
const environment=()=>({ALLOWED_ORIGIN:'https://falten-frei.github.io',RESEND_API_KEY:'test-key',MAIL_FROM:'Shop <orders@example.com>',HASH_SALT:'test-salt',DB:database()});
const request=()=>new Request('https://example.com/order',{method:'POST',headers:{Origin:'https://falten-frei.github.io','Content-Type':'application/json'},body:JSON.stringify(payload)});

test('owner and buyer receive separate messages, confirmed retries do not resend',async t=>{
 const sent=[];t.mock.method(globalThis,'fetch',async(url,options)=>{assert.equal(url,'https://api.resend.com/emails');sent.push(JSON.parse(options.body));return Response.json({id:'accepted'})});
 const env=environment();const response=await worker.fetch(request(),env);
 assert.equal(response.status,200);assert.equal((await response.json()).ok,true);
 assert.equal(OWNER_EMAIL,'faltenfrei.im.schlaf@gmail.com');assert.equal(sent.length,2);
 assert.deepEqual(sent[0].to,[OWNER_EMAIL]);assert.equal(sent[0].reply_to,payload.customer.email);
 assert.deepEqual(sent[1].to,[payload.customer.email]);assert.equal(sent[1].reply_to,OWNER_EMAIL);
 assert.match(sent[1].text,/Ваш заказ получен/);assert.match(sent[0].text,/308,00/);assert.match(sent[0].text,/19 % MwSt/);
 await worker.fetch(request(),env);assert.equal(sent.length,2);
});
test('partial delivery returns error, retry sends only the outstanding buyer receipt',async t=>{
 const sent=[];let rejectBuyer=true;
 t.mock.method(globalThis,'fetch',async(url,options)=>{const m=JSON.parse(options.body);sent.push(m);if(m.to[0]===payload.customer.email&&rejectBuyer)return new Response('Unavailable',{status:503});return Response.json({id:'accepted'})});
 const env=environment();let response=await worker.fetch(request(),env);assert.equal(response.status,502);assert.equal((await response.json()).ok,false);
 rejectBuyer=false;response=await worker.fetch(request(),env);assert.equal(response.status,200);
 assert.equal(sent.filter(m=>m.to[0]===OWNER_EMAIL).length,1);assert.equal(sent.filter(m=>m.to[0]===payload.customer.email).length,2);
});
test('missing mail configuration never reports a successful order',async()=>{
 const env=environment();delete env.RESEND_API_KEY;const response=await worker.fetch(request(),env);assert.equal(response.status,503);assert.equal((await response.json()).ok,false);
});
test('German receipt confirms receipt without accepting the order',()=>{
 const receipt=customerReceipt(validate({...payload,language:'de'}));assert.match(receipt.text,/Ihre Bestellung ist bei uns eingegangen/);assert.match(receipt.text,/keine Auftragsannahme/);
});

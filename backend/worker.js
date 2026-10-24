// Optional email backend. Deploy separately; GitHub Pages cannot execute this file.
import prices from './prices.json' with {type:'json'};
import {calculate} from '../core.js';
export const OWNER_EMAIL='faltenfrei.im.schlaf@gmail.com';
const emailRE=/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
const text=v=>typeof v==='string'?v.trim():'';
export function validate(payload){
 if(!payload||!['order','partner'].includes(payload.kind))throw Error('Invalid request');
 if(!/^[a-zA-Z0-9-]{20,60}$/.test(payload.requestId||''))throw Error('Invalid request id');
 if(payload.trade!==true)throw Error('Trade confirmation required');
 const c=payload.customer||{};
 for(const key of ['firstName','lastName','email','phone','salon','street','postal','city','country'])if(!text(c[key])||c[key].length>200)throw Error('Invalid '+key);
 if(!emailRE.test(c.email)||/[\r\n]/.test(c.email)||text(c.phone).length<6)throw Error('Invalid contact');
 if(text(c.message).length>2000)throw Error('Message too long');
 const customer=Object.fromEntries(['firstName','lastName','email','phone','salon','street','postal','city','country','message'].map(k=>[k,text(c[k])]));
 let items=[];let totals=null;
 if(payload.kind==='order'){
  if(payload.terms!==true||!Array.isArray(payload.items)||!payload.items.length||payload.items.length>30)throw Error('Invalid order');
  const seen=new Set();
  items=payload.items.map(x=>{const p=prices[x.id];if(!p||!Number.isInteger(p.net)||!Number.isInteger(x.quantity)||x.quantity<1||x.quantity>99||seen.has(x.id))throw Error('Invalid item');seen.add(x.id);return{id:x.id,quantity:x.quantity,price:p.net,name:p.name,volume:p.volume}});
  totals=calculate(items);if(!totals.eligible)throw Error('Minimum order is 250 EUR net');
 }
 return {kind:payload.kind,requestId:payload.requestId,language:payload.language==='ru'?'ru':'de',customer,items,totals,productId:text(payload.productId).slice(0,150)};
}
const eur=n=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(n/100);
function bodyFor(p){const c=p.customer;let s=`FaltenFrei · ${p.kind==='order'?'Bestellanfrage':'Kooperationsanfrage'}\nReferenz: ${p.requestId}\n\n${c.firstName} ${c.lastName}\nSalon: ${c.salon}\nE-Mail: ${c.email}\nTelefon: ${c.phone}\n${c.street}\n${c.postal} ${c.city}\n${c.country}\nGewerbe: vom Antragsteller bestätigt, manuell zu prüfen\n`;
 if(p.productId)s+=`\nProduktinteresse: ${p.productId}\n`;
 if(p.totals){s+='\n'+p.items.map(x=>`${x.quantity} × ${x.name}, ${x.volume} · ${eur(x.price)} netto/Stk. = ${eur(x.price*x.quantity)}`).join('\n');s+=`\n\nWarenwert netto: ${eur(p.totals.subtotal)}\nVersand netto: ${eur(p.totals.shipping)}\nGesamt netto: ${eur(p.totals.net)}\n19 % MwSt.: ${eur(p.totals.vat)}\nGesamt brutto: ${eur(p.totals.total)}\n\nLiefergebiet, Lieferkonditionen und steuerliche Behandlung sind vor Annahme zu bestätigen.\nAGB B2B akzeptiert.\n`;}
 return s+`\nNachricht: ${c.message||'—'}\n\nDies ist eine Eingangsbestätigung, keine Auftragsannahme. Ein Vertrag entsteht erst nach gesonderter Vereinbarung in Textform.\n`;
}
export function customerReceipt(p){
 const order=p.kind==='order';
 const ru=p.language==='ru';
 return {
  subject:ru?(order?'FaltenFrei · Ваш заказ получен':'FaltenFrei · Ваша заявка получена'):(order?'FaltenFrei · Ihre Bestellung ist eingegangen':'FaltenFrei · Ihre Anfrage ist eingegangen'),
  text:(ru?(order?'Спасибо! Ваш заказ получен. В ближайшее время мы свяжемся с вами для его оформления.':'Спасибо! Ваша заявка на сотрудничество получена. В ближайшее время мы свяжемся с вами.'):(order?'Vielen Dank! Ihre Bestellung ist bei uns eingegangen. Wir werden uns in Kürze mit Ihnen in Verbindung setzen, um die Bestellung abzuwickeln.':'Vielen Dank! Ihre Kooperationsanfrage ist bei uns eingegangen. Wir werden uns in Kürze mit Ihnen in Verbindung setzen.'))+'\n\n'+bodyFor(p)
 };
}
async function hash(s){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))].map(x=>x.toString(16).padStart(2,'0')).join('')}
async function send(env,key,message){const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':key},body:JSON.stringify(message)});if(!r.ok)throw Error('Mail provider rejected delivery');}
export default {async fetch(request,env){
 const origin=request.headers.get('Origin')||'';
 const cors={'Access-Control-Allow-Origin':env.ALLOWED_ORIGIN||'','Vary':'Origin','Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Content-Type':'application/json','Cache-Control':'no-store'};
 const result=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:cors});
 if(!env.ALLOWED_ORIGIN||origin!==env.ALLOWED_ORIGIN)return result({ok:false,error:'Origin not allowed'},403);
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 if(request.method!=='POST'||!request.headers.get('Content-Type')?.includes('application/json'))return result({ok:false,error:'Invalid method'},405);
 if(!env.RESEND_API_KEY||!env.MAIL_FROM||!env.DB||!env.HASH_SALT)return result({ok:false,error:'Email delivery is not configured'},503);
 let p;
 try{const raw=await request.text();if(raw.length>20000)return result({ok:false,error:'Request too large'},413);p=validate(JSON.parse(raw))}catch{return result({ok:false,error:'Please check your data'},400)}
 try{
  const fingerprint=await hash(JSON.stringify(p));
  const existing=await env.DB.prepare('SELECT fingerprint, owner_sent, customer_sent FROM requests WHERE id=?').bind(p.requestId).first();
  if(existing&&existing.fingerprint!==fingerprint)return result({ok:false,error:'Request id conflict'},409);
  if(existing?.owner_sent&&existing?.customer_sent)return result({ok:true,reference:p.requestId});
  if(!existing){
   // Salted counters only; raw IP and customer information are never stored in D1.
   const bucket=Math.floor(Date.now()/3600000);
   const ip=await hash(env.HASH_SALT+'|'+(request.headers.get('CF-Connecting-IP')||'unknown')+'|'+bucket);
   const email=await hash(env.HASH_SALT+'|'+p.customer.email.toLowerCase()+'|'+bucket);
   for(const id of [ip,email]){
    await env.DB.prepare('INSERT INTO rate_limit(id,hits,bucket) VALUES (?,1,?) ON CONFLICT(id) DO UPDATE SET hits=hits+1').bind(id,bucket).run();
    const row=await env.DB.prepare('SELECT hits FROM rate_limit WHERE id=?').bind(id).first();
    if(row.hits>5)return result({ok:false,error:'Too many requests. Please contact us by email.'},429);
   }
   await env.DB.prepare('INSERT OR IGNORE INTO requests(id,fingerprint,owner_sent,customer_sent,created) VALUES (?,?,0,0,?)').bind(p.requestId,fingerprint,Date.now()).run();
   await env.DB.prepare('DELETE FROM rate_limit WHERE bucket<?').bind(bucket-24).run();
   await env.DB.prepare('DELETE FROM requests WHERE created<?').bind(Date.now()-7*86400000).run();
  }
  const body=bodyFor(p);
  if(!existing?.owner_sent){await send(env,'ff-owner-'+p.requestId,{from:env.MAIL_FROM,to:[OWNER_EMAIL],reply_to:p.customer.email,subject:'FaltenFrei · '+(p.kind==='order'?'Neue Bestellung eingegangen':'Neue Kooperationsanfrage'),text:body});await env.DB.prepare('UPDATE requests SET owner_sent=1 WHERE id=?').bind(p.requestId).run()}
  if(!existing?.customer_sent){await send(env,'ff-customer-'+p.requestId,{from:env.MAIL_FROM,to:[p.customer.email],reply_to:OWNER_EMAIL,...customerReceipt(p)});await env.DB.prepare('UPDATE requests SET customer_sent=1 WHERE id=?').bind(p.requestId).run()}
  return result({ok:true,reference:p.requestId});
 }catch{return result({ok:false,error:'Delivery could not be confirmed. Please retry with the same request reference.'},502)}
}};

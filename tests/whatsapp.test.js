import test from 'node:test';
import assert from 'node:assert/strict';
import {whatsappOrder} from '../whatsapp.js';
const order={phone:'+49 172 7676092',reference:'test-123',customer:{firstName:'Test',lastName:'Salon',salon:'QA & Co',email:'test@example.com',phone:'+49000000000',street:'Test 1',postal:'00000',city:'Teststadt',country:'DE',message:'Prüfung: ä & ?'},lines:[{name:'Perfekter Touch Maske',volume:'200 ml',price:7700,quantity:4}]};
test('WhatsApp uses the configured recipient and preserves all order details when URL encoded',()=>{
 const de=whatsappOrder(order);const url=new URL(de.url);assert.equal(url.origin,'https://wa.me');assert.equal(url.pathname,'/491727676092');assert.equal(url.searchParams.get('text'),de.text);
 for(const value of ['4 × Perfekter Touch Maske (200 ml)','308,00','15,00','61,37','384,37','test@example.com','QA & Co','Prüfung: ä & ?','test-123'])assert.ok(de.text.includes(value),value);
 assert.ok(whatsappOrder({...order,phone:'491234567890'}).url.startsWith('https://wa.me/491234567890?'));
 const ru=whatsappOrder({...order,language:'ru'});assert.match(ru.text,/Заявка на заказ/);assert.match(ru.text,/НДС 19 %/);assert.match(ru.text,/Адрес доставки/);
 const free=whatsappOrder({...order,lines:[{...order.lines[0],quantity:5}]});assert.match(free.text,/Versand netto: 0,00/);
});
test('empty cart, invalid quantity and invalid destination cannot create a checkout link',()=>{
 for(const change of [{phone:'bad'},{lines:[]},{lines:[{...order.lines[0],quantity:1.5}]}])assert.throws(()=>whatsappOrder({...order,...change}));
});

test('orders below 250 EUR can be prepared while an explicit future minimum switch still blocks them',()=>{
 const small={...order,lines:[{...order.lines[0],quantity:1}]};assert.match(whatsappOrder(small).text,/77,00/);assert.match(whatsappOrder(small).text,/109,48/);assert.throws(()=>whatsappOrder({...small,config:{minimumNet:25000,enforceMinimum:true,freeShippingNet:35000,shippingNet:1500,vatRate:.19}}));
});

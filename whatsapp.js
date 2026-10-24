import {calculate} from './core.js';

// Pure formatting: no customer information is persisted or sent here.
export function whatsappOrder({phone,language='de',reference,customer,lines,config}) {
 const number=String(phone||'').replace(/[+\s()-]/g,'');
 if(!/^[1-9]\d{7,14}$/.test(number))throw Error('Invalid WhatsApp number');
 if(!lines.length||lines.some(l=>!Number.isInteger(l.price)||l.price<0||!Number.isInteger(l.quantity)||l.quantity<1||l.quantity>99))throw Error('Invalid cart');
 const t=calculate(lines,config);
 if(!t.eligible)throw Error('Minimum order not reached');
 const ru=language==='ru';
 const tr=(de,ruText)=>ru?ruText:de;
 const money=n=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(n/100);
 const country={DE:tr('Deutschland','Германия'),AT:tr('Österreich','Австрия'),OTHER:tr('Anderes Land — bitte vereinbaren','Другая страна — по согласованию')}[customer.country]||customer.country;
 const text=[
  'FaltenFrei · '+tr('Unverbindliche Bestellanfrage','Заявка на заказ'),
  tr('Referenz: ','Номер заявки: ')+reference,'',
  ...lines.map(l=>`${l.quantity} × ${l.name} (${l.volume}) · ${money(l.price)} ${tr('netto/Stk.','нетто/шт.')} = ${money(l.price*l.quantity)}`),'',
  tr('Warenwert netto: ','Товары нетто: ')+money(t.subtotal),
  tr('Versand netto: ','Доставка нетто: ')+money(t.shipping),
  tr('Gesamt netto: ','Всего нетто: ')+money(t.net),
  tr('19 % MwSt.: ','НДС 19 %: ')+money(t.vat),
  tr('Gesamt brutto: ','Всего брутто: ')+money(t.total),'',
  tr('Name: ','Имя: ')+customer.firstName+' '+customer.lastName,
  tr('Salon / Firma: ','Салон / фирма: ')+customer.salon,
  'E-Mail: '+customer.email,
  tr('Telefon: ','Телефон: ')+customer.phone,
  tr('Lieferadresse: ','Адрес доставки: ')+`${customer.street}, ${customer.postal} ${customer.city}, ${country}`,
  tr('Gewerbe vorhanden; Nachweis wird manuell geprüft.','Gewerbe имеется; документы проверяются вручную.'),
  tr('AGB für Gewerbekunden akzeptiert.','Условия для бизнес-клиентов приняты.'),
  customer.message?tr('Nachricht: ','Комментарий: ')+customer.message:'','',
  tr('Bitte bestätigen Sie Verfügbarkeit, Lieferung und Zahlungsbedingungen. Die Anfrage ist unverbindlich; es entsteht noch kein Kaufvertrag.','Просьба подтвердить наличие, доставку и условия оплаты. Заявка не обязывает к покупке и сама по себе не заключает договор.')
 ].join('\n');
 return {text,url:`https://wa.me/${number}?text=${encodeURIComponent(text)}`};
}

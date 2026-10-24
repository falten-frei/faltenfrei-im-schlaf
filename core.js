export function calculate(lines, config={minimumNet:25000,enforceMinimum:false,freeShippingNet:35000,shippingNet:1500,vatRate:.19}) {
 const subtotal=lines.reduce((n,x)=>n+x.price*x.quantity,0);
 const shipping=subtotal===0||subtotal>=config.freeShippingNet?0:config.shippingNet;
 const net=subtotal+shipping;
 const vat=Math.round(net*config.vatRate);
 return {subtotal,shipping,net,vat,total:net+vat,eligible:subtotal>0&&(config.enforceMinimum!==true||subtotal>=config.minimumNet),missing:Math.max(0,config.minimumNet-subtotal),freeMissing:Math.max(0,config.freeShippingNet-subtotal)};
}

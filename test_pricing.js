const price = '$9';
const result = price.replace(/\$\d+/, '$' + Math.round(parseInt(price.replace(/\D/g, '')) * 0.8));
console.log('Original:', price);
console.log('Discounted (20%):', result);

const price = '$9';
const mathRound = Math.round(parseInt(price.replace(/\D/g, '')) * 0.8 * 12);
const perMonth = (mathRound / 12).toFixed(2);
console.log('Original monthly:', price);
console.log('Annual total:', '$' + mathRound);
console.log('Equivalent per month:', '$' + perMonth);

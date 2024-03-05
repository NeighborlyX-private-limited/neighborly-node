const fs = require('fs')
const outputLog = fs.createWriteStream('./outputLog.log');
const errorsLog = fs.createWriteStream('./errorsLog.log');


const consoler = new console.Console(outputLog, errorsLog);


setInterval(function () {
consoler.log(new Date());
consoler.error(new Error('Hey Nope'));
}, 10000);
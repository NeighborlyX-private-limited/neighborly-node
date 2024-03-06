const fs = require('fs')
const outputLog = fs.createWriteStream('./outputLog.log');
const errorsLog = fs.createWriteStream('./errorsLog.log');
const fs = require('fs');
const util = require('util');
const fileLog = fs.createWriteStream(__dirname + '/server.log', {flags : 'w'});
const ErrorLog = fs.createWriteStream(__dirname + '/Error.log', {flags : 'w'});
const logOutput = process.stdout;
console.log  = (entry) => {
    fileLog.write(util.format(entry) + '\n');
    logOutput.write(util.format(entry) + '\n');
    };
    
    
    console.error = (entry) => {
    ErrorLog.write(util.format(entry) + '\n');
    }
    
    
    module.exports = {console}
    const consoler = new console.Console(outputLog, errorsLog);


setInterval(function () {
consoler.log(new Date());
consoler.error(new Error('Error'));
}, 10000);



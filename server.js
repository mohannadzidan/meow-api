require('dotenv').config();
var express = require('express');
var app = express();
var sm = require('./server-modules.js');
/**
 * @
 */

const address = process.env.MEOW_SERVER_ADDRESS;
const port = process.env.MEOW_SERVER_PORT;

app.use(express.static('build'));
app.use(function (req, res, next) {
    // TODO: dangerous
    // for debugging purpose...
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PUT");
    res.setHeader("Access-Control-Allow-Headers", "*");
    if (req.method === "OPTIONS") {
        res.status(200).send();
    } else next();
});
// init modules
console.log('initializing modules...');
sm.setApp(app);
// define start page
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/build/index.html');
});
app.listen(port, address);
console.log('Meow server started on: http://' + address + ':' + port);
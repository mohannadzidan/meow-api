require('dotenv').config();
const { json } = require('body-parser');
var express = require('express');
const { db } = require('./db');
var app = express();

const modules = [
    require('./modules/auth'),
    require('./modules/newsfeed'),
    require('./modules/people'),
]
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
    res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PUT,DELETE");
    res.setHeader("Access-Control-Allow-Headers", "*");
    if (req.method === "OPTIONS") {
        res.status(200).send();
    } else next();
});


app.use('/api', json());

// init modules
modules.forEach((module, index) => {
    if (!module.router) throw new Error('module at index=' + index + ' doesn\'t export a router of type express.Router!')
    console.log('initializing module ' + (module.name ?? 'Unknown') + '...');
    app.use(module.router);
    if (!module.name) console.warn('Warning: the module at index=' + index + ' doesn\'t export module name.')
})

// define start page
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/build/index.html');
});
app.listen(port, address);
console.log('Meow server started on: http://' + address + ':' + port);

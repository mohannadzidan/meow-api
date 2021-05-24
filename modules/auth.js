var Bcrypt = require('bcryptjs');
var Parsers = require('../parsers.js');
var Schema = require('../schema.js');
var JWT = require('jsonwebtoken');
var db = require('../db.js').prisma;
var sm = require('../server-modules.js');
var secret = process.env.SECRET;

var credentialsSchema = {
    email: {
        type: 'string',
        maxLength: 64,
        minLength: 5
    },
    password: {
        type: 'string',
        maxLength: 64,
        minLength: 8
    }
}

/**
  * 
  * @param {import('express').Request} req 
  * @param {import('express').Response} res 
  */
function authorize(req, res, next) {
    if (!Schema.validateObject(req.body, credentialsSchema)) {
        res.status(400).send();
        return;
    }
    db.user.findFirst({
        where: {
            email: req.body.email
        }
    }).then(account => {
        if (account && Bcrypt.compareSync(req.body.password, account.password)) {
            delete account.password;
            const token = JWT.sign({ uid: account.uid }, secret, { expiresIn: 86400 });
            account.token = token;
            res.status(200).header('Content-Type', 'application/json').send(account);
            next();

        } else {
            res.status(409).send()
        }
    }).catch(err => {
        res.status(500).send();
        console.error(err);
    });

}


/**
  * 
  * @param {import('express').Request} req 
  * @param {import('express').Response} res 
  */
function authorizeWithToken(req, res, next) {
    const token = req.headers['id-token'];
    if (token) {
        try {
            const decodedToken = JWT.verify(token, secret);
            db.user.findFirst({ where: { uid: decodedToken.uid } }).then(account => {
                if (account) {
                    delete account.password;
                    account.token = token;
                    res.status(200).header('Content-Type', 'application/json').send(account);
                    next();
                } else {
                    res.status(401).send();
                }
            });
        } catch (e) {
            res.status(401).send();
        }
    } else {
        res.status(401).send();
    }

}


/**
 * 
 * @param {import('express').Request} req 
 * @param {import('express').Response} res 
 * @param {*} next 
 */
function isAuthorized(req, res, next) {
    const token = req.headers['id-token'];
    if (token) {
        try {
            const decodedToken = JWT.verify(token, secret);
            db.user.findFirst({ where: { uid: decodedToken.uid } }).then(account => {
                if (account) {
                    req.auth = account;
                    next();
                } else {
                    res.status(401).send();
                }

            });
        } catch (e) {
            res.status(401).send();
        }
    } else {
        res.status(401).send();
    }
}

/**
 * 
 * @param {import('express').Express} app 
 */
exports.init = function (app) {
    app.post('/api/auth', Parsers.JsonParser, authorize);
    app.get('/api/auth', authorizeWithToken);
    exports.isAuthorized = isAuthorized;
    exports.authorize = authorize;
}
sm.registerModule(exports);
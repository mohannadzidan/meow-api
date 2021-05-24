var auth = require('./auth.js');
var Bcrypt = require('bcryptjs');
var Parsers = require('../parsers.js');
var Schema = require('../schema.js');
var gen = require('../generators.js');
var db = require('../db.js').prisma;
var sm = require('../server-modules.js');

var ErrorCodes = {
    ALREADY_EXISTS: {
        email_UNIQUE: 'EMAIL_ALREADY_EXISTS',
        username_UNIQUE: 'USERNAME_ALREADY_EXISTS'
    }
}

var validateUserCreationSchema = Schema.validateJsonSchema({
    username: {
        type: 'string',
        maxLength: 64,
        minLength: 1
    },
    email: {
        type: 'string',
        maxLength: 64,
        minLength: 5
    },
    password: {
        type: 'string',
        maxLength: 64,
        minLength: 8
    },
    displayName: {
        type: 'string',
        maxLength: 64,
        minLength: 1
    },
    displayImage: { // base64
        type: 'string',
        optional: true
    }
})

function createUser(req, res) {
    req.body.password = hashPassword(req.body.password);
    req.body.uid = gen.uid();
    db.user.create({ data: req.body }).then(q => {
        delete q.password;
        res.status(201).header('Content-Type', 'application/json').send(q);
    }).catch(err => {
        if (err.code === 'P2002') {
            res.status(409).header('Content-Type', 'application/json').send({
                code: ErrorCodes.ALREADY_EXISTS[err.meta.target]
            });
        } else {
            res.status(500).send();
            console.error(err);
        }
    });
}

/**
     * 
     * @param {import('express').Request} req 
     * @param {import('express').Response} res 
     * @param {*} next 
     */
function getUser(req, res, next) {
    const by = req.query.uid ? 'uid' : req.query.username ? 'username' : undefined;
    if (by) {
        db.user.findFirst({ where: { [by]: req.query[by] } })
            .then(account => {
                if (account) {
                    delete account.password;
                    res.status(200).header('Content-Type', 'application/json').send(account);
                    next();
                } else {
                    res.status(404).send();
                }
            }).catch(err => {
                res.status(500).send();
                console.error(err);
            })
    } else {
        res.status(400).send();
    }
}

function deleteUser(req, res, next) {
    db.user.delete({ where: { uid: req.auth.uid } })).then(() => {
        res.status(200).send();
        next();
    }).catch(err => {
        console.error(err);
        res.status(500).send();
    });
}

function hashPassword(password) {
    return Bcrypt.hashSync(password, 8);
}

/**
 * 
 * @param {import('express').Express} app 
 */
exports.init = function (app) {
    app.post('/api/user',
        Parsers.JsonParser,
        validateUserCreationSchema,
        createUser);
    app.get('/api/user',
        auth.isAuthorized,
        getUser);
    app.delete('/api/user',
        auth.isAuthorized,
        deleteUser);

}
sm.registerModule(exports);
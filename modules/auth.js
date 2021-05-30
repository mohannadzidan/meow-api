var Bcrypt = require('bcryptjs');
var Parsers = require('../parsers.js');
var { requireRequestBody } = require('../schema.js');
var JWT = require('jsonwebtoken');
var {db} = require('../db.js');
var { respondsWithJson, routeObjectFunctions } = require('../middleware/common');
const { Q } = require('../sql-queries.js');
const { ErrorCodes, Errors, handleInternalError, handleTokenError, respondWithError } = require('../errors');
const secret = process.env.SECRET;
const ID_TOKEN_EXPIRY = 86400;
const REFRESH_TOKEN_EXPIRY = ID_TOKEN_EXPIRY * 30;

var signUpSchema = {
    strict: true,
    properties: {
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
    }
};

var signInSchema = {
    strict: true,
    properties: {
        password: {
            type: 'string',
            maxLength: 64,
            minLength: 8
        },
        email: {
            type: 'string',
            maxLength: 64,
            minLength: 5
        },
    }
};

/**
 * 
 * @param {import('express').Request} req 
 * @param {import('express').Response} res 
 * @param {Function} next 
 */
function authenticate(req, res, next) {
    const header = req.headers['authorization']?.split(' ', 2);
    if (header && header[0].toLocaleLowerCase() === 'bearer') {
        const tokenString = header[1];
        JWT.verify(tokenString, secret, (err, token) => {
            if (err) {
                handleTokenError(res, err, 'id');
            } else {
                if (req.auth === undefined) req.auth = {};
                req.auth.id = token.id;
                next();
            }
        });
    } else {
        respondWithError(res, Errors.Token.ID_TOKEN_REQUIRED);
    }
}

function generateIdToken(id, expiresIn = ID_TOKEN_EXPIRY, callback) {
    return JWT.sign({ id: id, grant: 'ídToken' }, secret, { expiresIn: expiresIn }, callback);
}

function generateRefreshToken(id, password, expiresIn = REFRESH_TOKEN_EXPIRY, callback) {
    return JWT.sign({ id: id, password: password, grant: 'refreshIdToken' }, secret, { expiresIn: expiresIn }, callback);
}

const token = {
    /**
     * 
     * @param {import('express').Request} req 
     * @param {import('express').Response} res 
     */
    refresh: function (req, res) {
        if (!req.body.refreshToken) {
            respondWithError(res, Errors.BAD_REQUEST);
            return;
        }
        JWT.verify(req.body.refreshToken, secret, (err, token) => {
            if (err) {
                handleTokenError(res, err, 'refresh');
            } else if (token.grant === 'refreshIdToken') {
                db.user.findFirst({
                    where: { id: token.id }
                }).then(account => {
                    if (account && token.password === account.password) {
                        const idToken = generateIdToken(account.id);
                        const payload = {
                            idToken: idToken,
                            refreshToken: req.body.refreshToken,
                            localId: account.id,
                            expiresIn: ID_TOKEN_EXPIRY,
                            email: account.email
                        }
                        res.status(200).send(payload);
                    } else {
                        respondWithError(res, Errors.Token.INVALID_ID_TOKEN);
                    }
                }).catch(e => handleInternalError(res, e));
            } else {
                respondWithError(res, Errors.Token.INVALID_REFRESH_TOKEN);
            }
        });
    }

}
const accounts = {

    /**
     * 
     * @param {import('express').Request} req 
     * @param {import('express').Response} res 
     */
    signUp: function (req, res) {
        if (requireRequestBody(req, res, signUpSchema)) {
            req.body.password = Bcrypt.hashSync(req.body.password);
            db.user.create({
                data: req.body
            }).then(account => {
                const idToken = generateIdToken(account.id);
                const refreshToken = generateRefreshToken(account.id, account.password);
                const payload = {
                    idToken: idToken,
                    refreshToken: refreshToken,
                    localId: account.id,
                    expiresIn: ID_TOKEN_EXPIRY,
                    email: account.email
                }
                res.status(201).send(payload);
            }).catch(err => {
                if (err.code === 'P2002') {
                    respondWithError(res, Errors[err.meta.target.toUpperCase() + '_ALREADY_EXISTS']);
                } else {
                    handleInternalError(res, err);
                }
            });
        }

    },
    /**
     * 
     * @param {import('express').Request} req 
     * @param {import('express').Response} res 
     */
    signInWithPassword: function (req, res) {
        if (requireRequestBody(req, res, signInSchema)) {
            db.user_view.findFirst({
                where: {
                    email: req.body.email
                }
            }).then(account => {
                if (account && Bcrypt.compareSync(req.body.password, account.password)) {
                    const idToken = generateIdToken(account.id);
                    const refreshToken = generateRefreshToken(account.id, account.password);
                    const payload = {
                        idToken: idToken,
                        refreshToken: refreshToken,
                        localId: account.id,
                        expiresIn: ID_TOKEN_EXPIRY,
                        email: account.email
                    }
                    res.status(200).send(payload);
                } else {
                    respondWithError(res, Errors.WRONG_CREDENTIALS);
                }
            }).catch(e => handleInternalError(res, e));
        }

    },

    /**
     * 
     * @param {import('express').Request} req 
     * @param {import('express').Response} res 
     */
    lookup: function (req, res) {
        if (!req.body.idToken) {
            respondWithError(res, Errors.BAD_REQUEST);
            return;
        }
        JWT.verify(req.body.idToken, secret, (err, token) => {
            if (err) {
                handleTokenError(res, err, 'id');
            } else {
                db.user_view.findFirst({
                    where: { id: token.id }
                }).then(account => {
                    if (account)
                        res.status(200).send(account);
                    else
                        respondWithError(res, Errors.USER_NOT_FOUND);
                }).catch(e => handleInternalError(res, e));
            }
        })
    },

    /**
     * 
     * @param {import('express').Request} req 
     * @param {import('express').Response} res 
     */
    delete: function (req, res) {
        if (!req.body.idToken) {
            respondWithError(res, Errors.BAD_REQUEST);
            return;
        }
        JWT.verify(req.body.idToken, secret, (err, token) => {
            if (err) {
                handleTokenError(res, err, 'id');
            } else {
                db.user.findFirst({
                    where: { id: token.id }
                }).then(account => {
                    if (account)
                        return db.user.delete({ where: { id: token.id } });
                    else {
                        return Promise.reject(404);
                    }
                }).then((x) => {
                    res.status(204).send({});
                }).catch(e => {
                    if (e === 404) {
                        respondWithError(res, Errors.USER_NOT_FOUND);
                    } else {
                        handleInternalError(res, e)
                    }
                });
            }
        });
    },
}

/**
 * 
 * @param {import('express').Express} app 
 */
exports.init = function (app) {
    
    app.post('/api/auth/accounts::method',
        Parsers.JsonParser,
        respondsWithJson,
        routeObjectFunctions('method', accounts)
    );

    app.post('/api/auth/token::method',
        Parsers.JsonParser,
        respondsWithJson,
        routeObjectFunctions('method', token)
    );

    function promisify(func, ...params) {
        return new Promise((resolve, reject) => {
            func(...params, (err, result) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(result);
                }
            });
        });
    }
    const nopassword = Bcrypt.hashSync('nopassword');
    const wrongpassword = Bcrypt.hashSync('wrongpassword');
    app.get('/api/auth/test',
        respondsWithJson,
        (req, res, next) => {
            const promises = [
                promisify(generateIdToken, 339, ID_TOKEN_EXPIRY),
                promisify(generateIdToken, 339, 0),
                promisify(generateIdToken, 3000, ID_TOKEN_EXPIRY),
                promisify(generateRefreshToken, 339, nopassword, REFRESH_TOKEN_EXPIRY),
                promisify(generateRefreshToken, 339, nopassword, 0),
                promisify(generateRefreshToken, 339, wrongpassword, REFRESH_TOKEN_EXPIRY),
                promisify(generateRefreshToken, 3000, nopassword, REFRESH_TOKEN_EXPIRY),
            ];
            Promise.all(promises).then(r => {
                const payload = {
                    idToken: r[0],
                    expiredIdToken: r[1],
                    deletedUserIdToken: r[2],
                    refreshToken: r[3],
                    expiredRefreshToken: r[4],
                    wrongPasswordRefreshToken: r[5],
                    deletedUserRefreshToken: r[6],
                }
                res.status(200).send(payload);
            }).catch(e => handleInternalError(res, e));

        });
}



exports.authenticate = authenticate;
exports.moduleName = 'auth';


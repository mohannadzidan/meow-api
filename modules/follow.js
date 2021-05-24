var Parsers = require('../parsers.js');
var auth = require('./auth.js');
var Schema = require('../schema.js');
var gen = require('../generators.js');
var db = require('../db.js').prisma;
var Q = require('../sql-queries.js').Q;
var sm = require('../server-modules.js');


/**
  * 
  * @param {import('express').Request} req 
  * @param {import('express').Response} res 
  */
function getSuggestedUsers(req, res, next) {
    db.$queryRaw(Q('suggest-users', { userUid: req.auth.uid })).then(result => {
        res.status(200).send(JSON.stringify(result));
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
function getFollowers(req, res, next) {
    if (!req.query.user || !req.query.offset)
        return res.status(400).send();
    try {
        offset = req.query.offset ? Number.parseInt(req.query.offset) : 0;
    } catch (e) {
        res.status(400).send();
        return;
    }

    db.$queryRaw(Q('user-followers', { userUid: req.query.user, offset: req.query.offset, count: 10 })).then(result => {
        res.status(200).send(JSON.stringify(result));
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
function getFollowings(req, res, next) {
    if (!req.query.user || !req.query.offset)
        return res.status(400).send();
    try {
        req.query.offset = Number.parseInt(req.query.offset);
    } catch (e) {
        return res.status(400).send();
    }

    db.$queryRaw(Q('user-followings', { userUid: req.query.user, offset: req.query.offset, count: 10 })).then(result => {
        res.status(200).send(JSON.stringify(result));
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
function getFollow(req, res, next) {
    const q = req.query.get;
    if (q === 'followers') {
        getFollowers(req, res, next);
    } else if (q === 'followings') {
        getFollowings(req, res, next);
    } else if (q === 'suggestions') {
        getSuggestedUsers(req, res, next);
    } else {
        res.status(400).send();
    }
}
/**
  * 
  * @param {import('express').Request} req 
  * @param {import('express').Response} res 
  */
function toggleFollow(req, res, next) {
    if (!req.query.user || req.query.user === req.auth.uid) {
        res.status(400).send();
        return;
    }
    let wasFollowing;
    db.user.findFirst({
        where: {
            uid: req.query.user
        }
    }).then(user => {
        if (user) {
            return db.follow.findFirst({
                where: {
                    firstUserUid: req.auth.uid,
                    AND: {
                        secondUserUid: req.query.user
                    }
                }
            });
        }
        res.status(404).send();
    }).then(r => {
        wasFollowing = r !== null;
        if (r) {
            return db.follow.delete({
                where: {
                    uid: r.uid
                }
            });
        } else {
            return db.follow.create({
                data: {
                    firstUserUid: req.auth.uid,
                    secondUserUid: req.query.user,
                    uid: gen.uid()
                }
            });
        }
    }).then((r) => {
        res.status(201).send({
            userUid: req.query.user,
            followed: !wasFollowing
        });
    }).catch(e => {
        console.error(e);
        res.status(500).send();
    })

}

/**
 * 
 * @param {import('express').Express} app 
 */
exports.init = function (app) {

    app.post('/api/follow',
        auth.isAuthorized,
        toggleFollow);
    app.get('/api/follow',
        auth.isAuthorized,
        getFollow);
}
sm.registerModule(exports);
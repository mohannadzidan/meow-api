const { respondsWithJson, routeObjectFunctions } = require('../middleware/common.js');
const { JsonParser } = require('../parsers.js');
const { authenticate } = require('./auth.js');
const { db } = require('../db');
const { requireParams, converters } = require('../query-params');
const { handleInternalError, respondWithError, Errors } = require('../errors.js');
const { Q } = require('../query-builder');

const users = {
    GET: {
        /**
         * 
         * @param {import('express').Request} req 
         * @param {import('express').Response} res 
         */
        lookup: function (req, res) {
            const by = req.query.id ? 'id' : req.query.username ? 'username' : undefined;
            const value = by == 'id' ? converters.integer(req.query.id) : req.query.username;
            if (by) {
                db.user_view.findFirst({
                    where: {
                        [by]: value
                    }
                }).then(account => {
                    if (account) {
                        delete account.password;
                        res.status(200).send(account);
                    } else return Promise.reject(Errors.USER_NOT_FOUND);
                }).catch(e => {
                    if (e === Errors.USER_NOT_FOUND) {
                        respondWithError(res, e);
                    } else handleInternalError(res, e)
                });
            }
        }
    }
}

const followings = {
    id: {
        POST: {
            /**
             * 
             * @param {import('express').Request} req 
             * @param {import('express').Response} res 
             */
            root: function (req, res) {
                const queriedId = converters.integer(req.params.queriedId);
                const userId = converters.integer(req.params.userId);
                const value = req.body.value;
                if (value === undefined || typeof value !== 'boolean') {
                    respondWithError(res, Errors.BAD_REQUEST);
                    return;
                }
                if (queriedId === undefined) {
                    respondWithError(res, Errors.USER_NOT_FOUND);
                    return;
                }
                if (req.auth.id !== userId) {
                    respondWithError(res, Errors.PERMISSION_DENIED);
                    return;
                }
                db.user.findFirst({
                    where: { id: queriedId }
                }).then(queriedUser => {
                    if (queriedUser) {
                        return db.follow.findFirst({ where: { firstId: userId, secondId: queriedId } });
                    } else {
                        return Promise.reject(Errors.USER_NOT_FOUND);
                    }
                }).then(follow => {
                    const isFollowing = follow !== undefined;
                    if (isFollowing !== value && value === true) {
                        return db.follow.create({ data: { firstId: userId, secondId: queriedId } });
                    } else if (isFollowing !== value && value === false) {
                        return db.$queryRaw`DELETE FROM follow WHERE firstId = ${userId} AND secondId = ${queriedId}`;
                    }
                }).then(() => {
                    res.status(201).send({ value: value });
                }).catch(err => {
                    if (err === Errors.USER_NOT_FOUND) {
                        respondWithError(res, err);
                    } else {
                        handleInternalError(res, err);
                    }
                });

            },
            /**
             * 
             * @param {import('express').Request} req 
             * @param {import('express').Response} res 
             */
            toggle: function (req, res) {
                const queriedId = converters.integer(req.params.queriedId);
                const userId = converters.integer(req.params.userId);
                if (queriedId === undefined) {
                    respondWithError(res, Errors.USER_NOT_FOUND);
                    return;
                }
                if (req.auth.id !== userId) {
                    respondWithError(res, Errors.PERMISSION_DENIED);
                    return;
                }
                db.user.findFirst({
                    where: { id: queriedId }
                }).then(queriedUser => {
                    if (queriedUser) {
                        return db.follow.findFirst({ where: { firstId: userId, secondId: queriedId } });
                    } else {
                        return Promise.reject(Errors.USER_NOT_FOUND);
                    }
                }).then(follow => {
                    if (!follow) {
                        return db.follow.create({ data: { firstId: userId, secondId: queriedId } });
                    } else {
                        return db.$queryRaw`DELETE FROM follow WHERE firstId = ${userId} AND secondId  = ${queriedId}`;
                    }
                }).then((x) => {
                    let state = !Array.isArray(x); 
                    res.status(201).send({ value: state});
                }).catch(err => {
                    if (err === Errors.USER_NOT_FOUND) {
                        respondWithError(res, err);
                    } else {
                        handleInternalError(res, err);
                    }
                });

            },
        },
    },

    /**
     * 
     * @param {import('express').Request} req 
     * @param {import('express').Response} res 
     */
    GET: function (req, res) {
        const queriedId = converters.integer(req.params.userId);
        const offset = converters.integer(req.query.offset) ?? 0;
        if (queriedId === undefined) {
            respondWithError(res, Errors.USER_NOT_FOUND);
            return;
        }
        db.user.findFirst({
            where: { id: queriedId }
        }).then(user => {
            if (user) {
                return db.$queryRaw`SELECT 
                                        user_view.* 
                                    FROM 
                                        follow INNER JOIN user_view ON follow.secondId = user_view.id  
                                    WHERE 
                                        firstId = ${queriedId} 
                                    LIMIT ${offset}, ${10};`;
            } else {
                return Promise.reject(Errors.USER_NOT_FOUND);
            }
        }).then(followers => {
            res.status(200).send(followers);
        }).catch(err => {
            if (err === Errors.USER_NOT_FOUND) {
                respondWithError(res, err);
            } else {
                handleInternalError(res, err);
            }
        })
    },
    /**
     * 
     * @param {import('express').Request} req 
     * @param {import('express').Response} res 
     */
    patch: function (req, res) {
        const queriedId = converters.integer(req.params.userId);
        if (queriedId === undefined) {
            respondWithError(res, Errors.USER_NOT_FOUND);
            return;
        }
        if (queriedId !== req.auth.id) {
            respondWithError(res, Errors.PERMISSION_DENIED);
            return;
        }
        let follows = [];
        let unFollows = [];
        for (const [key, value] of Object.entries(req.body)) {
            const id = converters.integer(key);
            if (id === undefined) {
                respondWithError(res, Errors.BAD_REQUEST);
                return;
            }
            if (value === true) {
                follows.push(id);
            } else if (value === false) {
                unFollows.push(id);
            } else {
                respondWithError(res, Errors.BAD_REQUEST);
                return;
            }
        }
        // get followings
        db.follow.findMany({
            where: { firstId: req.auth.id }
        }).then(followings => {
            const existingFollowings = {};
            followings.forEach(x => existingFollowings[x.secondId] = true);
            follows = follows.filter(x => !existingFollowings[x]);
            unFollows = unFollows.filter(x => existingFollowings[x]);
            Promise.all([
                db.follow.createMany({
                    data: follows.map(f => {
                        return { firstId: req.auth.id, secondId: f }
                    })
                }),
                db.follow.deleteMany({
                    where: {
                        firstId: req.auth.id,
                        AND: {
                            secondId: {
                                in: unFollows
                            }
                        }
                    }
                })
            ]).then(() => {
                const changed = {}
                follows.forEach(x => changed[x] = true);
                unFollows.forEach(x => changed[x] = false);
                res.status(200).send(changed)
            }).catch(err => handleInternalError(res, err));
        })
    }
}

const followers = {
    /**
     * 
     * @param {import('express').Request} req 
     * @param {import('express').Response} res 
     */
    GET: function (req, res) {
        const queriedId = converters.integer(req.params.userId);
        const offset = converters.integer(req.query.offset) ?? 0;
        if (queriedId === undefined) {
            respondWithError(res, Errors.USER_NOT_FOUND);
            return;
        }
        db.user.findFirst({
            where: { id: queriedId }
        }).then(user => {
            if (user) {
                return db.$queryRaw`SELECT 
                                        user_view.* 
                                    FROM 
                                        follow INNER JOIN user_view ON follow.firstId = user_view.id  
                                    WHERE 
                                        secondId = ${queriedId} 
                                    LIMIT ${offset}, ${10};`;
            } else {
                return Promise.reject(Errors.USER_NOT_FOUND);
            }
        }).then(followers => {
            res.status(200).send(followers);
        }).catch(err => {
            if (err === Errors.USER_NOT_FOUND) {
                respondWithError(res, err);
            } else {
                handleInternalError(res, err);
            }
        })
    },
}
/**
 * 
 * @param {import('express').Express} app 
 */
exports.init = function (app) {
    app.get('/api/people/users::method',
        JsonParser,
        respondsWithJson,
        authenticate,
        routeObjectFunctions('method', users.GET),
    );

    app.get('/api/people/:userId/followers',
        JsonParser,
        respondsWithJson,
        authenticate,
        followers.GET,
    );

    app.get('/api/people/:userId/followings',
        JsonParser,
        respondsWithJson,
        authenticate,
        followings.GET,
    );
    app.post('/api/people/:userId/followings/:queriedId::method',
        JsonParser,
        respondsWithJson,
        authenticate,
        routeObjectFunctions('method', followings.id.POST),
    );
    app.post('/api/people/:userId/followings/:queriedId',
        JsonParser,
        respondsWithJson,
        authenticate,
        followings.id.POST.root,
    );


}
exports.moduleName = 'people';
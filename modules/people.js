const { routeObjectFunctions } = require('../middleware/common.js');
const { authenticate } = require('./auth.js');
const { db } = require('../db');
const { converters } = require('../query-params');
const { handleInternalError, respondWithError, Errors } = require('../errors.js');
const { selectSpecificFieldsRaw } = require('../endpoints-features.js');
const router = require('express').Router();
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
                        res.status(200).json(account);
                    } else return Promise.reject(Errors.USER_NOT_FOUND);
                }).catch(e => {
                    if (e === Errors.USER_NOT_FOUND) {
                        respondWithError(res, e);
                    } else handleInternalError(res, e)
                });
            }
        }
    },
    posts: {
        /**
            * 
            * @param {import('express').Request} req 
            * @param {import('express').Response} res 
            */
        GET: function (req, res) {
            const userId = converters.integer(req.params.userId);
            if (userId === undefined) {
                return respondWithError(res, Errors.USER_NOT_FOUND);
            }
            const before = converters.integer(req.query.before) ?? Number.MAX_SAFE_INTEGER;
            const after = converters.integer(req.query.after) ?? 0;
            // SELECT * FROM post_view WHERE userId = ${user} AND timestamp > ${after} AND timestamp < ${before} ORDER BY timestamp LIMIT 10; 
            db.post_view.findMany({
                where: {
                    userId: userId,
                    AND: {
                        timestamp: { gt: after },
                        AND: { timestamp: { lt: before } }
                    }
                },
                orderBy: {
                    timestamp: 'desc',
                },
                take: 10

            }).then(posts => {
                res.status(200).json(posts);
            }).catch(e => handleInternalError(res, e));
        },

    },
}

const followings = {
    allowedFields: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        displayImageUrl: true,
        birthdate: true,
        location: true,
        bio: true,
        registrationTimestamp: true,
        followersCount: true,
        followingsCount: true,
    },
    id: {
        methods: {
            POST: {
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
                        res.status(201).json({ value: state });
                    }).catch(err => {
                        if (err === Errors.USER_NOT_FOUND) {
                            respondWithError(res, err);
                        } else {
                            handleInternalError(res, err);
                        }
                    });

                },
            }
        },
        /**
         * 
         * @param {import('express').Request} req 
         * @param {import('express').Response} res 
         */
        POST: function (req, res) {
            const targetId = converters.integer(req.params.targetId);
            const sourceId = converters.integer(req.params.sourceId);
            if (targetId === undefined) {
                respondWithError(res, Errors.USER_NOT_FOUND);
                return;
            }
            if (req.auth.id !== sourceId) {
                respondWithError(res, Errors.PERMISSION_DENIED);
                return;
            }
            db.follow.create({
                data: { firstId: sourceId, secondId: targetId }
            }).then((x) => {
                res.status(204).json(x);
            }).catch(e => {
                if (e.code = 'P2002' && e.meta.field_name === 'secondId') {
                    respondWithError(res, Errors.USER_NOT_FOUND);
                } else if (e.code = 'P2002' && e.meta.target === 'PRIMARY') {
                    respondWithError(res, Errors.ALREADY_FOLLOWING);
                } else {
                    handleInternalError(res, e);
                }
            });

        },
        /**
         * 
         * @param {import('express').Request} req 
         * @param {import('express').Response} res 
         */
        DELETE: function (req, res) {
            const targetId = converters.integer(req.params.targetId);
            const sourceId = converters.integer(req.params.sourceId);
            if (targetId === undefined) {
                respondWithError(res, Errors.USER_NOT_FOUND);
                return;
            }
            if (sourceId !== req.auth.id) {
                respondWithError(res, Errors.PERMISSION_DENIED);
                return;
            }
            db.$executeRaw`DELETE FROM follow WHERE firstId = ${sourceId} AND secondId = ${targetId} LIMIT 1`.then((affectedRows) => {
                if (affectedRows === 0) return Promise.reject(Errors.WAS_NOT_FOLLOWING);
                res.status(204).json();
            }).catch(err => {
                if (err === Errors.WAS_NOT_FOLLOWING) {
                    respondWithError(res, err);
                } else handleInternalError(res, err);
            });

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
        const fields = req.query.fields;
        let select = 'user_view.*';
        let limit = 10;
        let singleField = false;
        if (fields) {
            select = selectSpecificFieldsRaw(fields, followings.allowedFields, 'user_view');
            if (select === undefined) {
                respondWithError(res, Errors.BAD_REQUEST, { target: 'fields' });
                return;
            }
            // select 10x the limit if only one field
            if (fields.indexOf(',') === -1) {
                singleField = true;
                limit *= 10;
            }
        }
        if (queriedId === undefined) {
            respondWithError(res, Errors.USER_NOT_FOUND);
            return;
        }
        db.user.findFirst({
            where: { id: queriedId }
        }).then(user => {
            if (user) {
                return db.$queryRaw(`SELECT 
                                        ${select}
                                    FROM 
                                        follow INNER JOIN user_view ON follow.secondId = user_view.id  
                                    WHERE 
                                        firstId = ${queriedId} 
                                    LIMIT ${offset}, ${limit};`);
            } else {
                return Promise.reject(Errors.USER_NOT_FOUND);
            }
        }).then(followers => {
            if(singleField){
                followers = followers.map(x => x[fields]);
            }
            res.status(200).json(followers);
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
     * Experimental
     * @param {import('express').Request} req 
     * @param {import('express').Response} res 
     */
    PATCH: function (req, res) {
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
                res.status(200).json(changed)
            }).catch(err => handleInternalError(res, err));
        })
    }
}

const followers = {
    allowedFields: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        displayImageUrl: true,
        birthdate: true,
        location: true,
        bio: true,
        registrationTimestamp: true,
        followersCount: true,
        followingsCount: true,
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
        const fields = req.query.fields;
        let select = 'user_view.*';
        let limit = 10;
        if (fields) {
            select = selectSpecificFieldsRaw(fields, followers.allowedFields, 'user_view');
            if (select === undefined) {
                respondWithError(res, Errors.BAD_REQUEST, { target: 'fields' });
                return;
            }
            // select 10x the limit if only one field
            if (fields.indexOf(',') === -1) limit *= 10;
        }
        db.user.findFirst({
            where: { id: queriedId }
        }).then(user => {
            if (user) {
                return db.$queryRaw(`SELECT 
                                        ${select} 
                                    FROM 
                                        follow INNER JOIN user_view ON follow.firstId = user_view.id  
                                    WHERE 
                                        secondId = ${queriedId} 
                                    LIMIT ${offset}, ${limit};`);
            } else {
                return Promise.reject(Errors.USER_NOT_FOUND);
            }
        }).then(followers => {
            res.status(200).json(followers);
        }).catch(err => {
            if (err === Errors.USER_NOT_FOUND) {
                respondWithError(res, err);
            } else {
                handleInternalError(res, err);
            }
        })
    },
}


router.get('/api/people/users::method',
    authenticate,
    routeObjectFunctions('method', users.GET),
);

router.get('/api/people/:userId/posts',
    authenticate,
    users.posts.GET,
);

router.get('/api/people/:userId/followers',
    authenticate,
    followers.GET,
);

router.get('/api/people/:userId/followings',
    authenticate,
    followings.GET,
);

router.post('/api/people/:userId/followings/:queriedId::method',
    authenticate,
    routeObjectFunctions('method', followings.id.POST),
);

router.post('/api/people/:sourceId/followings/:targetId',
    authenticate,
    followings.id.POST,
);

router.delete('/api/people/:sourceId/followings/:targetId',
    authenticate,
    followings.id.DELETE,
);



exports.router = router;
exports.name = 'People';
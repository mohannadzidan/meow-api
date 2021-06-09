const { routeObjectFunctions } = require('../middleware/common.js');
const { authenticate } = require('./auth.js');
const { db, PrismaErrorCodes } = require('../db');
const { converters } = require('../query-params');
const { handleInternalError, respondWithError, Errors } = require('../errors.js');
const { selectSpecificFieldsRaw, selectSpecificFields } = require('../endpoints-features.js');
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
                let acc;
                db.user_view.findFirst({
                    where: {
                        [by]: value
                    }
                }).then(account => {
                    if (account) {
                        delete account.password;
                        acc = account;
                        return db.follow.findMany({
                            select: {
                                secondId: true,
                            },
                            where: {
                                firstId: req.auth.id
                            }
                        });
                    } else return Promise.reject(Errors.USER_NOT_FOUND);
                }).then(followings => {
                    acc.followed = followings.find(f => f.secondId === acc.id) !== undefined;
                    res.status(200).json(acc);
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
            return db.$queryRaw`SELECT *, EXISTS(select postId from post_like WHERE userId = ${req.auth.id} AND postId = id) as liked FROM post_view WHERE userId = ${userId} AND timestamp < ${before} AND timestamp > ${after} ORDER BY timestamp DESC LIMIT 10;`.then(posts => {
                posts.forEach(post => post.liked = post.liked ? true : false);
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
                    db.follow.create({
                        data: { firstId: userId, secondId: queriedId }
                    }).then(() => {
                        res.status(201).json({ state: true });
                    }).catch(err => {
                        if (err.code === PrismaErrorCodes.UNIQUE_CONSTRAINT_FAILED) {
                            return db.follow.delete({
                                where: {
                                    firstId_secondId: { firstId: userId, secondId: queriedId }
                                }
                            });
                            //respondWithError(res, Errors.USER_NOT_FOUND);
                        } else if (err.code === PrismaErrorCodes.FOREIGN_KEY_CONSTRAINT_FAILED) {
                            respondWithError(res, Errors.USER_NOT_FOUND);
                        } else {
                            handleInternalError(res, err);
                        }
                        return false;
                    }).then((ok) => {
                        if (ok) {
                            res.status(201).json({ state: false });
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
                if (e.code = PrismaErrorCodes.UNIQUE_CONSTRAINT_FAILED && e.meta.field_name === 'secondId') {
                    respondWithError(res, Errors.USER_NOT_FOUND);
                } else if (e.code = PrismaErrorCodes.UNIQUE_CONSTRAINT_FAILED && e.meta.target === 'PRIMARY') {
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
    methods: {
        GET: {
            /**
            * 
            * @param {import('express').Request} req 
            * @param {import('express').Response} res 
            */
            suggest: function (req, res) {
                const authId = req.auth.id;
                if (req.params.sourceId != authId) {
                    respondWithError(res, Errors.PERMISSION_DENIED);
                    return;
                }
                const offset = converters.integer(req.query.offset) ?? 0;
                let selection;
                try {
                    selection = selectSpecificFieldsRaw(req.query, followings.allowedFields, 10, 'user_view');
                } catch (err) {
                    respondWithError(res, err);
                    return;
                }
                db.follow.findMany({
                    select: {
                        secondId: true,
                    },
                    where: {
                        firstId: authId
                    }
                }).then(followings => {
                    followings = followings.map(x => x.secondId);
                    if (followings.length > 0) {
                        return db.$queryRaw(`
                        SELECT ${selection.select}, count(user_view.id) as connections FROM user_view INNER JOIN follow ON follow.secondId = user_view.id 
                        WHERE follow.firstId IN (${followings.join(',')}) AND follow.secondId NOT IN (${followings.join(',')}) AND user_view.id <> ${authId}  GROUP BY user_view.id ORDER BY connections DESC LIMIT ${offset}, ${selection.limit};
                        `);
                    }
                    return [];

                }).then(suggestions => {
                    res.status(200).json(suggestions);
                }).catch(e => handleInternalError(res, e));
            }
        }
    },
    /**
     * 
     * @param {import('express').Request} req 
     * @param {import('express').Response} res 
     */
    GET: function (req, res) {
        const queriedId = converters.integer(req.params.userId);
        const offset = converters.integer(req.query.offset) ?? 0;
        let selection;
        try {
            selection = selectSpecificFieldsRaw(req.query, followings.allowedFields, 10, 'user_view');
        } catch (err) {
            respondWithError(res, err);
            return;
        }

        db.user.findFirst({
            where: { id: queriedId }
        }).then(user => {
            if (user) {
                return db.follow.findMany({
                    select: {
                        secondId: true,
                    },
                    where: {
                        firstId: authId
                    }
                });

            } else {
                return Promise.reject(Errors.USER_NOT_FOUND);
            }
        }).then(followings => {
            followings = followings.map(x => x.secondId);
            return db.$queryRaw(`SELECT ${selection.select}, IF(user_view.id IN (${followings.join()}), TRUE, FALSE)AS followed
                FROM follow INNER JOIN user_view ON follow.secondId = user_view.id  
                WHERE firstId = ${queriedId} LIMIT ${offset}, ${selection.limit};`);

        }).then(followings => {
            if (selection.isSingleField) {
                followings = followings.map(x => x[req.query.fields]);
            }
            res.status(200).json(followings);
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
        let selection;
        try {
            selection = selectSpecificFieldsRaw(req.query, followers.allowedFields, 10, 'user_view');
        } catch (err) {
            console.log(err);

            respondWithError(res, err);
            return;
        }
        db.user.findFirst({
            where: { id: queriedId }
        }).then(user => {
            if (user) {
                return db.$queryRaw(`SELECT 
                                        ${selection.select} 
                                    FROM 
                                        follow INNER JOIN user_view ON follow.firstId = user_view.id  
                                    WHERE 
                                        secondId = ${queriedId} 
                                    LIMIT ${offset}, ${selection.limit};`);
            } else {
                return Promise.reject(Errors.USER_NOT_FOUND);
            }
        }).then(followers => {
            if (selection.isSingleField) {
                followers = followers.map(x => x[req.query.fields]);
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
}


router.get('/api/people/users::method',
    authenticate,
    routeObjectFunctions('method', users.GET),
);

router.get('/api/people/:userId/posts',
    authenticate,
    users.posts.GET,
);

// followers
router.get('/api/people/:userId/followers',
    authenticate,
    followers.GET,
);
// followings
router.get('/api/people/:userId/followings',
    authenticate,
    followings.GET,
);

router.post('/api/people/:sourceId/followings/:targetId',
    authenticate,
    followings.id.POST,
);

router.delete('/api/people/:sourceId/followings/:targetId',
    authenticate,
    followings.id.DELETE,
);

router.post('/api/people/:userId/followings::method/:queriedId',
    authenticate,
    routeObjectFunctions('method', followings.id.methods.POST),
);
router.get('/api/people/:sourceId/followings::method',
    authenticate,
    routeObjectFunctions('method', followings.methods.GET),
);


exports.router = router;
exports.name = 'People';
var auth = require('./auth.js');
var { requireRequestBody } = require('../schema.js');
var { db, PrismaErrorCodes } = require('../db');
var convertParams = require('../query-params').convertParams;
const { respondWithError, Errors, handleInternalError } = require('../errors.js');
const { routeObjectFunctions } = require('../middleware/common.js');
const { requireParams, converters } = require('../query-params');
const router = require('express').Router();

const postCreationSchema = {
    strict: true,
    properties: {
        content: {
            type: 'string',
            maxLength: 350,
            minLength: 1
        },
        sharedPostId: {
            type: 'number',
            optional: true,
        }
    }
};

const commentCreationSchema = {
    strict: true,
    properties: {
        content: {
            type: 'string',
            maxLength: 350,
            minLength: 1
        }
    }

};

var posts = {
    /**
     * http://[host]/api/newsfeed/posts:method
     */
    methods: {
        POST: {
            /**
             * 
             * @param {import('express').Request} req 
             * @param {import('express').Response} res 
             */
            create: function (req, res) {
                if (requireRequestBody(req, res, postCreationSchema)) {
                    const content = req.body.content;
                    // INSERT INTO post (content, sharedPostId, userId) VALUES (${content}, ${sharedPostId}, ${userId});
                    db.post.create({
                        data: {
                            content: content,
                            sharedPostId: req.body.sharedPostId,
                            userId: req.auth.id,
                        }
                    }).then(result => {
                        // for newly created posts, add values from the view
                        result.sharesCount = 0;
                        result.likesCount = 0;
                        result.commentsCount = 0;
                        result.liked = false;
                        result.timestamp = Math.floor(result.timestamp.getTime() / 1000);
                        res.status(201).json(result);
                    }).catch(e => {
                        if (e.code === PrismaErrorCodes.FOREIGN_KEY_CONSTRAINT_FAILED) {
                            respondWithError(res, Errors.POST_NOT_FOUND, { target: 'sharedPostId' });
                        } else
                            handleInternalError(res, e);
                    });
                }
            }
        },
        GET: {

        }

    },
    /**
    * http://[host]/api/newsfeed/posts/{postId}
    */
    id: {
        /**
         * 
         * @param {import('express').Request} req 
         * @param {import('express').Response} res 
         */
        DELETE: function (req, res) {
            const postId = converters.integer(req.params.postId);
            if (postId === undefined) {
                return respondWithError(res, Errors.POST_NOT_FOUND);
            }
            db.post.findFirst({
                where: { id: postId }
            }).then(post => {
                if (!post) {
                    return Promise.reject(Errors.POST_NOT_FOUND);
                }
                if (post.userId !== req.auth.id) {
                    return Promise.reject(Errors.PERMISSION_DENIED);
                }
                return db.$queryRaw`DELETE FROM post WHERE id =${postId};`;
            }).then(() => {
                res.status(204).json();
            }).catch(e => {
                if (e === Errors.PERMISSION_DENIED) {
                    respondWithError(res, Errors.PERMISSION_DENIED);
                } else if (e === Errors.POST_NOT_FOUND) {
                    respondWithError(res, e);
                } else {
                    handleInternalError(res, e);
                }
            });
        },

        /**
         *
         * http://[host]/api/newsfeed/posts
         * @param {import('express').Request} req 
         * @param {import('express').Response} res 
         */
        GET: function (req, res) {
            const postId = converters.integer(req.params.postId);
            if (postId === undefined) {
                return respondWithError(res, Errors.POST_NOT_FOUND);
            }

            db.$queryRaw`SELECT *, EXISTS(select postId from post_like WHERE userId = ${req.auth.id} AND postId = ${postId}) as liked FROM post_view where id = ${postId} LIMIT 1;`.then(post => {
                if (!post || post.length === 0) {
                    return Promise.reject(Errors.POST_NOT_FOUND);
                }
                post = post[0];
                post.liked = post.liked ? true : false;
                res.status(200).json(post);
            }).catch(e => {
                if (e === Errors.POST_NOT_FOUND) {
                    respondWithError(res, e);
                } else {
                    handleInternalError(res, e);
                }
            });
        },
    },
    /** 
    * 
    * @param {import('express').Request} req 
    * @param {import('express').Response} res 
    */
    GET: function (req, res) {
        if (requireParams(req, res, { before: 'integer?', after: 'integer?' })) {
            const before = req.query.before ?? Number.MAX_SAFE_INTEGER;
            const after = req.query.after ?? 0;

            // get all followings
            db.follow.findMany({
                select: { secondId: true }, where: { firstId: req.auth.id }
            }).then(result => {
                // remap into set
                const idSet = result.map((x => x.secondId));
                idSet.push(req.auth.id) // push self id
                const query = `SELECT *, EXISTS(select postId from post_like WHERE post_like.userId = ${req.auth.id} AND post_like.postId = id) as liked FROM post_view where post_view.userId IN (${idSet.join()}) AND post_view.timestamp < ${before} AND post_view.timestamp > ${after} ORDER BY post_view.timestamp DESC LIMIT 10;`;
                return db.$queryRaw(query);
            }).then(posts => {
                posts.forEach(post => post.liked = post.liked ? true : false);
                res.status(200).json(posts);
            }).catch(e => handleInternalError(res, e));
        }
    },

}

var comments = {
    id: {
        /**
         * 
         * http://[host]/api/posts/{postId/comments/{commentId} Method DELETE
         * @param {import('express').Request} req 
         * @param {import('express').Response} res 
         */
        DELETE: function (req, res) {
            const commentId = converters.integer(req.params.commentId);
            const postId = converters.integer(req.params.postId);
            if (commentId === undefined) {
                return respondWithError(res, Errors.COMMENT_NOT_FOUND);
            }
            if (postId === undefined) {
                return respondWithError(res, Errors.POST_NOT_FOUND);
            }
            db.comment.findFirst({
                where: {
                    postId: postId,
                    AND: {
                        id: commentId
                    }
                }
            }).then(comment => {
                if (!comment) return Promise.reject(Errors.COMMENT_NOT_FOUND);
                if (comment.userId !== req.auth.id) return Promise.reject(Errors.PERMISSION_DENIED);
                return db.comment.delete({ where: { id: comment.id } });
            }).then(() => {
                res.status(204).json({});
            }).catch(e => {
                if (e === Errors.COMMENT_NOT_FOUND || e === Errors.PERMISSION_DENIED) {
                    respondWithError(res, e);
                } else {
                    handleInternalError(res, e);
                }
            });
        },
        /**
         * http://[host]/api/posts/{postId/comments/{commentId} Method GET
         * @param {import('express').Request} req 
         * @param {import('express').Response} res 
         */
        GET: function (req, res) {
            const commentId = converters.integer(req.params.commentId);
            const postId = converters.integer(req.params.postId);
            if (commentId === undefined) {
                return respondWithError(res, Errors.COMMENT_NOT_FOUND);
            }
            if (postId === undefined) {
                return respondWithError(res, Errors.POST_NOT_FOUND);
            }
            db.$queryRaw(`SELECT *, EXISTS(SELECT commentId from comment_like where comment_like.userId = comment_view.userId AND comment_like.commentId = comment_view.id) as liked from comment_view where id = ${commentId} limit 1;`).then(comment => {
                if (!comment || comment.length === 0) return Promise.reject(Errors.COMMENT_NOT_FOUND);
                comment = comment[0];
                comment.liked = comment.liked === 1;
                res.status(200).json(comment);
            }).catch(e => {
                if (e === Errors.COMMENT_NOT_FOUND) {
                    respondWithError(res, e);
                } else {
                    handleInternalError(res, e);
                }
            });
        }
    },

    /**
    * 
    * http://[host]/api/posts/POST_ID/comments Method GET
    * @param {import('express').Request} req 
    * @param {import('express').Response} res 
    */
    GET: function (req, res) {
        const before = converters.integer(req.query.before) ?? Number.MAX_SAFE_INTEGER;
        const after = converters.integer(req.query.after) ?? 0;
        const postId = converters.integer(req.params.postId);
        if (postId === undefined) {
            respondWithError(res, Errors.POST_NOT_FOUND);
            return;
        }
        db.$queryRaw(`SELECT *, EXISTS(SELECT commentId from comment_like where comment_like.userId = comment_view.userId AND comment_like.commentId = comment_view.id) as liked from comment_view where postId = ${postId} AND timestamp < ${before} AND timestamp > ${after} ORDER BY timestamp DESC limit 10;`).then(comments => {
            res.status(200).json(comments);
        }).catch(e => {
            if (e === Errors.COMMENT_NOT_FOUND) {
                respondWithError(res, e);
            } else {
                handleInternalError(res, e);
            }
        });
    },
    methods: {
        POST: {
            /**
             * 
             * @param {import('express').Request} req 
             * @param {import('express').Response} res 
             */
            create: function (req, res) {
                if (requireRequestBody(req, res, commentCreationSchema)) {
                    const postId = converters.integer(req.params.postId);
                    if (postId === undefined) {
                        respondWithError(res, Errors.POST_NOT_FOUND);
                        return;
                    }
                    req.body.userId = req.auth.id;
                    req.body.postId = postId;
                    db.comment.create({
                        data: req.body
                    }).then(comment => {
                        comment.likesCount = 0;
                        comment.liked=false;
                        comment.timestamp = Math.floor(comment.timestamp.getTime() / 1000);
                        res.status(201).json(comment);
                    }).catch(e => {
                        if (e.code === 'P2003' && e.meta.field_name === 'postId') {
                            respondWithError(res, Errors.POST_NOT_FOUND);
                        } else {
                            handleInternalError(res, e)
                        }
                    });
                }
            }
        }
    },

    get: {

        /**
         * 
         * @param {import('express').Request} req 
         * @param {import('express').Response} res 
         */
        lookup: function (req, res) {
            if (requireParams(req, res, { id: 'integer' })) {
                db.comment_view.findFirst({
                    where: { id: req.query.id }
                }).then(comment => {
                    if (comment === undefined) return Promise.reject(404);
                    res.status(200).json(comment);
                }).catch(e => {
                    if (e === 404) {
                        respondWithError(res, Errors.COMMENT_NOT_FOUND);
                    } else {
                        handleInternalError(res, e);
                    }
                });
            }
        },
        /**
        * 
        * @param {import('express').Request} req 
        * @param {import('express').Response} res 
        */
        on: function (req, res) {
            if (requireParams(req, res, { post: 'integer' })) {
                const before = req.query.before ?? Math.floor(Number.MAX_SAFE_INTEGER);
                const after = req.query.after ?? 0;
                b.post.findFirst({
                    where: { id: req.query.post }
                }).then(post => {
                    if (post === undefined) return Promise.reject(404);
                    return db.comment_view.findMany({
                        where: {
                            postId: post.id,
                            AND: {
                                timestamp: { lt: before },
                                AND: {
                                    timestamp: { gt: after }
                                }
                            }
                        },
                        take: 10
                    });
                }).then(comments => {
                    res.status(200).json(comments);
                }).catch(e => {
                    if (e === 404) {
                        respondWithError(res, Errors.POST_NOT_FOUND);
                    } else {
                        handleInternalError(res, e);
                    }
                });
            }
        },
    },
    delete: {
        /**
         * 
         * @param {import('express').Request} req 
         * @param {import('express').Response} res 
         */
        delete: function (req, res) {
            if (requireParams(req, res, { id: 'integer' })) {
                db.comment.findFirst({
                    where: { id: req.query.id }
                }).then(comment => {
                    if (comment === undefined) return Promise.reject(404);
                    if (comment.userId !== req.auth.id) return Promise.reject(403);
                    return db.comment.delete({ where: { id: req.query.id } });
                }).then(() => {
                    res.status(204).json();
                }).catch(e => {
                    if (e === 404) {
                        respondWithError(res, Errors.COMMENT_NOT_FOUND);
                    } else if (e === 403) {
                        respondWithError(res, Errors.PERMISSION_DENIED);
                    } else {
                        handleInternalError(res, e);
                    }
                });
            }
        },
    }
}

let likes = {
    post: {
        methods: {
            POST: {
                /**
                * 
                * @param {import('express').Request} req 
                * @param {import('express').Response} res 
                */
                toggle: function (req, res) {
                    const postId = converters.integer(req.params.postId);
                    if (postId === undefined) {
                        respondWithError(res, Errors.POST_NOT_FOUND);
                        return;
                    }
                    db.post_like.create({
                        data: { postId: postId, userId: req.auth.id }
                    }).then(like => {
                        res.status(200).send({ postId: postId, liked: true });
                    }).catch(e => {
                        if (e.code === PrismaErrorCodes.UNIQUE_CONSTRAINT_FAILED) {
                            return db.post_like.delete({ where: { postId_userId: { postId: postId, userId: req.auth.id } } })
                        } else if (e.code === PrismaErrorCodes.FOREIGN_KEY_CONSTRAINT_FAILED) {
                            respondWithError(res, Errors.POST_NOT_FOUND);
                        }
                        else {
                            handleInternalError(res, e);
                        }
                    }).then(removedLike => {
                        if(removedLike) res.status(200).send({ postId: postId, liked: false });
                    }).catch(e => handleInternalError(res, e));
                }
            }
        }
    },
    comment: {
        methods: {
            POST: {
                /**
                * 
                * @param {import('express').Request} req 
                * @param {import('express').Response} res 
                */
                toggle: function (req, res) {
                    const postId = converters.integer(req.params.postId);
                    const commentId = converters.integer(req.params.commentId);
                    if (postId === undefined) {
                        respondWithError(res, Errors.POST_NOT_FOUND);
                        return;
                    }
                    if (commentId === undefined) {
                        respondWithError(res, Errors.COMMENT_NOT_FOUND);
                        return;
                    }
                    db.comment_like.create({
                        data: { commentId: commentId, userId: req.auth.id }
                    }).then(like => {
                        res.status(200).json({ commentId: commentId, liked: true });
                    }).catch(e => {
                        if (e.code === PrismaErrorCodes.UNIQUE_CONSTRAINT_FAILED) {
                            return db.comment_like.delete({ where: { commentId_userId: { commentId: commentId, userId: req.auth.id } } })
                        } else if (e.code === PrismaErrorCodes.FOREIGN_KEY_CONSTRAINT_FAILED) {
                            respondWithError(res, Errors.COMMENT_NOT_FOUND);
                        }
                        else {
                            return Promise.reject(e);
                        }
                    }).then(removedLike => {
                        if(removedLike) res.status(200).json({ commentId: commentId, liked: false });
                    }).catch(e => handleInternalError(res, e));
                }
            }
        }
    }
}

router.post('/api/newsfeed/posts/:postId/likes::method',
    auth.authenticate,
    routeObjectFunctions('method', likes.post.methods.POST),
);


router.post('/api/newsfeed/posts/:postId/comments/:commentId/likes::method',
    auth.authenticate,
    routeObjectFunctions('method', likes.comment.methods.POST),
);

router.get('/api/newsfeed/posts',
    auth.authenticate,
    posts.GET,
);

router.post('/api/newsfeed/posts::method',
    auth.authenticate,
    routeObjectFunctions('method', posts.methods.POST),
);

router.get('/api/newsfeed/posts::method',
    auth.authenticate,
    routeObjectFunctions('method', posts.methods.GET),
);

router.get('/api/newsfeed/posts/:postId',
    auth.authenticate,
    posts.id.GET,
);

router.delete('/api/newsfeed/posts/:postId',
    auth.authenticate,
    posts.id.DELETE,
);

router.post('/api/newsfeed/posts/:postId/comments::method',
    auth.authenticate,
    routeObjectFunctions('method', comments.methods.POST),
);

router.get('/api/newsfeed/posts/:postId/comments',
    auth.authenticate,
    comments.GET
);

router.get('/api/newsfeed/posts/:postId/comments/:commentId',
    auth.authenticate,
    comments.id.GET,
);

router.delete('/api/newsfeed/posts/:postId/comments/:commentId',
    auth.authenticate,
    comments.id.DELETE,
);

exports.router = router;
exports.name = 'Newsfeed';
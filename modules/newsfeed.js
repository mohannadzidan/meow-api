var Parsers = require('../parsers.js');
var auth = require('./auth.js');
var { requireRequestBody } = require('../schema.js');
var { db } = require('../db');
var convertParams = require('../query-params').convertParams;
const e = require('express');
const { respondWithError, Errors, handleInternalError } = require('../errors.js');
const { routeObjectFunctions, respondsWithJson } = require('../middleware/common.js');
const { convertParam, requireParams, converters } = require('../query-params');
const { Q } = require('../query-builder');

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
                        result.timestamp = Math.floor(result.timestamp.getTime() / 1000);
                        res.status(201).send(result);
                    }).catch(e => handleInternalError(res, e));
                }
            }
        },
        GET: {

            /**
             * 
             * @param {import('express').Request} req 
             * @param {import('express').Response} res 
             */
            from: function (req, res) {
                if (requireParams(req, res, { user: 'integer', before: 'integer?', after: 'integer?' })) {
                    const user = req.query.user;
                    const before = req.query.before ?? Number.MAX_SAFE_INTEGER;
                    const after = req.query.before ?? 0;
                    // SELECT * FROM post_view WHERE userId = ${user} AND timestamp > ${after} AND timestamp < ${before} ORDER BY timestamp LIMIT 10; 
                    db.post_view.findMany({
                        where: {
                            userId: user,
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
                        res.status(200).send(posts);
                    }).catch(e => handleInternalError(res, e));
                }
            },

        },

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
                return db.post.delete({ where: { id: postId } });
            }).then(() => {
                res.status(204).send();
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
            if(postId === undefined){
                return respondWithError(res, Errors.POST_NOT_FOUND);
            }
            db.post_view.findFirst({
                where: { id: postId }
            }).then(post => {
                if (!post) {
                    return Promise.reject(Errors.POST_NOT_FOUND);
                }
                res.status(200).send(post);
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
                return db.post_view.findMany({
                    where: {
                        userId: { in: idSet }, AND: {
                            timestamp: { lt: before },
                            AND: {
                                timestamp: { gt: after }
                            }
                        }
                    },
                    take: 10,
                });
            }).then(posts => {
                res.status(200).send(posts);
            }).catch(e => handleInternalError(res, e));
        }
    },

}

var comments = {
    commentId: {
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
                res.status(204).send({});
            }).catch(e => {
                if (e === Errors.COMMENT_NOT_FOUND) {
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
            db.comment_view.findFirst({
                where: {
                    id: commentId,
                    AND: {
                        postId: postId,
                    },
                }
            }).then(comment => {
                if (!comment) return Promise.reject(Errors.COMMENT_NOT_FOUND);
                res.status(200).send(comment);
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
        db.comment_view.findMany({
            where: {
                postId: postId,
                AND: {
                    timestamp: {
                        lt: before,
                    },
                    AND: {
                        timestamp: {
                            gt: after,
                        }
                    }
                }
            },
            take: 10,
            orderBy: {
                timestamp: 'desc'
            }
        }).then(comments => {
            res.status(200).send(comments);
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
                        comment.timestamp = Math.floor(comment.timestamp.getTime() / 1000);
                        res.status(201).send(comment);
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
                    res.status(200).send(comment);
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
                    res.status(200).send(comments);
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
                    res.status(204).send();
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



/**
 * 
 * @param {import('express').Express} app 
 */
exports.init = function (app) {

    app.get('/api/newsfeed/posts',
        Parsers.JsonParser,
        respondsWithJson,
        auth.authenticate,
        posts.GET,
    );

    app.post('/api/newsfeed/posts::method',
        Parsers.JsonParser,
        respondsWithJson,
        auth.authenticate,
        routeObjectFunctions('method', posts.methods.POST),
    );
    app.get('/api/newsfeed/posts::method',
        Parsers.JsonParser,
        respondsWithJson,
        auth.authenticate,
        routeObjectFunctions('method', posts.methods.GET),
    );

    app.get('/api/newsfeed/posts/:postId',
        Parsers.JsonParser,
        respondsWithJson,
        auth.authenticate,
        posts.id.GET,
    );

    app.delete('/api/newsfeed/posts/:postId',
        Parsers.JsonParser,
        respondsWithJson,
        auth.authenticate,
        posts.id.DELETE,
    );

    app.post('/api/newsfeed/posts/:postId/comments::method',
        Parsers.JsonParser,
        respondsWithJson,
        auth.authenticate,
        routeObjectFunctions('method', comments.methods.POST),
    );
    app.get('/api/newsfeed/posts/:postId/comments',
        Parsers.JsonParser,
        respondsWithJson,
        auth.authenticate,
        comments.GET
    );

    app.get('/api/newsfeed/posts/:postId/comments/:commentId',
        Parsers.JsonParser,
        respondsWithJson,
        auth.authenticate,
        comments.commentId.GET,
    );

    app.delete('/api/newsfeed/posts/:postId/comments/:commentId',
        Parsers.JsonParser,
        respondsWithJson,
        auth.authenticate,
        comments.commentId.DELETE,
    );

}
exports.moduleName = 'newsfeed';
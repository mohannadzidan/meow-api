var Parsers = require('../parsers.js');
var auth = require('./auth.js');
var Schema = require('../schema.js');
var gen = require('../generators.js');
var db = require('../db.js').prisma;
var Q = require('../sql-queries.js').Q;
var sm = require('../server-modules.js');


var validatePostSchema = Schema.validateJsonSchema({
    content: {
        type: 'string',
        maxLength: 350,
        minLength: 1
    },
    sharedPostUid: {
        type: 'string',
        maxLength: 32,
        minLength: 32,
        optional: true
    },
});

var validateCommentSchema = Schema.validateJsonSchema({
    content: {
        type: 'string',
        maxLength: 350,
        minLength: 1
    },
    postUid: {
        type: 'string',
        maxLength: 32,
        minLength: 32,
    },
});


/**
  * 
  * @param {import('express').Request} req 
  * @param {import('express').Response} res 
  */
function createPost(req, res) {
    req.body.userUid = req.auth.uid;
    req.body.uid = gen.uid();
    if (req.body.sharedPostUid) {
        db.post.findFirst({ where: { uid: req.body.sharedPostUid } })
            .then(sharedPost => {
                if (sharedPost) {
                    req.body.sharedPostUid = sharedPost.sharedPostUid ? sharedPost.sharedPostUid : sharedPost.uid;
                    return db.post.create({ data: req.body });
                }
                res.status(404).header().send();
            }).then(q => {
                res.status(201).header('Content-Type', 'application/json').send(q);
            }).catch(err => {
                res.status(500).send();
                console.error(err);
            })
    } else {
        db.post.create({ data: req.body })
            .then(q => {
                res.status(201).header('Content-Type', 'application/json').send(q);
            }).catch(err => {
                res.status(500).header().send();
                console.error(err);
            });
    }

}



function getPost(req, res) {
    if (req.query.uid) {
        db.post.findFirst({ where: { uid: req.query.uid } })
            .then(post => {
                if (post)
                    res.status(200).header('Content-Type', 'application/json').send(post);
                else
                    res.status(404).send();
            }).catch(err => {
                res.status(500).send();
                console.error(err);
            })
    } else if (req.query.by && req.query.timestamp) {
        try {
            req.query.timestamp = new Date(Number.parseInt(req.query.timestamp) * 1000).toMySQLFormat();
        } catch (e) {
            res.status(400).send();
            return;
        }
        const timestamp = req.query.timestamp;
        const userUid = req.query.by;
        db.$queryRaw(Q('posts-by', {
            userUid: userUid,
            timestamp: timestamp,
            commentsCount: 3,
            postsCount: 10
        })).then(posts => {
            res.status(200).header('Content-Type', 'application/json').send(JSON.stringify(posts));
        }).catch(err => {
            res.status(500).send();
            console.error(err);
        })
    } else {
        try {
            if (req.query.timestamp)
                req.query.timestamp = new Date(Number.parseInt(req.query.timestamp) * 1000).toMySQLFormat();
            else {
                req.query.timestamp = new Date().toMySQLFormat();
            }
        } catch (e) {
            res.status(400).send();
            return;
        }
        const timestamp = req.query.timestamp;
        const userUid = req.auth.uid;
        db.$queryRaw(Q('newsfeed-posts', {
            userUid: userUid,
            timestamp: timestamp,
            commentsCount: 3,
            postsCount: 10
        })).then(posts => {
            res.status(200).header('Content-Type', 'application/json').send(JSON.stringify(posts));
        }).catch(err => {
            res.status(500).send();
            console.error(err);
        })
    }
}


/**
  * 
  * @param {import('express').Request} req 
  * @param {import('express').Response} res 
  */
function deletePost(req, res) {
    if (req.query.uid) {
        db.post.findFirst({ where: { uid: req.query.uid } })
            .then(post => {
                if (post && post.userUid === req.auth.uid) {
                    return db.post.delete({ where: { uid: req.query.uid } });
                } else if (!(post)) {
                    res.status(404).send();
                }
                res.status(403).send();
            }).then(q => {
                res.status(200).send();
            }).catch(err => {
                res.status(500).send();
                console.error(err);
            });
    } else {
        res.status(400).send();
    }

}


/**
  * 
  * @param {import('express').Request} req 
  * @param {import('express').Response} res 
  */
function createComment(req, res) {

    db.post.findFirst({ where: { uid: req.body.postUid } })
        .then(post => {
            if (post) {
                req.body.userUid = req.auth.uid;
                req.body.uid = gen.uid();
                return db.comment.create({ data: req.body });
            }
            res.status(404).send();
        }).then(q => {
            res.status(201).header('Content-Type', 'application/json').send(q);
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
function getComment(req, res) {
    if (req.query.postUid) {
        try {
            if (req.query.timestamp) 
                req.query.timestamp = new Date(Number.parseInt(req.query.timestamp) * 1000).toMySQLFormat();
             else
                req.query.timestamp = new Date().toMySQLFormat();
        } catch (e) {
            res.status(400).send();
            return;
        }
        db.post.findFirst({where: {uid: req.query.postUid}}).then((post) => {
            if(post){
                return db.comment.findMany({
                    where: {
                        uid: req.query.uid,
                        AND: {
                            timestamp: { lt: req.query.timestamp }
                        }
                    }, orderBy: {
                        timestamp: 'desc'
                    },
                    take: 10
                });
            }
            res.status(404).send();
            
        }).then(comments => {
            if (comments) {
                res.status(200).header('Content-Type', 'application/json').send(comments);
            }
        }).catch(err => {
            res.status(500).send();
            console.error(err);
        });
    } else if (req.query.uid) {
        db.comment.findFirst({ where: { uid: req.query.uid } })
            .then(comment => {
                if (comment) {
                    res.status(200).header('Content-Type', 'application/json').send(comment);
                }
                res.status(404).send();
            }).catch(err => {
                res.status(500).send();
                console.error(err);
            });
    } else {
        res.status(400).send();
    }
}


/**
  * 
  * @param {import('express').Request} req 
  * @param {import('express').Response} res 
  */
function toggleLike(req, res) {
    if (!req.query.uid) {
        res.status(400).send();
        return;
    }
    let result = {};
    db.$queryRaw(`
        SELECT 
            (SELECT uid FROM \`like\` WHERE useruid = '${req.auth.uid}' AND itemuid = '${req.query.uid}')AS likeUid,
            (SELECT Count(uid) FROM \`like\` WHERE  itemuid = '${req.query.uid}')  AS likes,
            IF(EXISTS(SELECT uid FROM   post WHERE  uid = '${req.query.uid}'), 
                'post'
            , IF(EXISTS(SELECT uid
                    FROM   comment
                    WHERE  uid = '${req.query.uid}'), 'comment',
            NULL)) AS itemType;
    `).then(l => {
        l = l[0];
        if (l.itemType === null) {
            res.status(404).send();
        } else if (l.likeUid) {
            result.liked = false;
            result.likes = l.likes - 1;
            return db.like.delete({ where: { uid: l.likeUid } })
        } else {
            result.liked = true;
            result.likes = l.likes + 1;
            return db.like.create({
                data: {
                    uid: gen.uid(),
                    itemUid: req.query.uid,
                    userUid: req.auth.uid,
                }
            });
        }
    }).then(ignored => {
        result.itemType = undefined;
        res.status(201).header('Content-Type', 'application/json').send(result);
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
function deleteComment(req, res) {
    if (req.query.uid) {
        db.comment.findFirst({ where: { uid: req.query.uid } })
            .then(comment => {
                if (comment && comment.userUid === req.auth.uid) {
                    return db.comment.delete({ where: { uid: req.query.uid } });
                } else if (!(comment)) {
                    res.status(404).send();
                }
                res.status(403).send();
            }).then(q => {
                res.status(200).header('Content-Type', 'application/json').send({ uid: req.query.uid });
            }).catch(err => {
                res.status(500).send();
                console.error(err);
            });
    } else {
        res.status(400).send();
    }
}

/**
 * 
 * @param {import('express').Express} app 
 */
exports.init = function (app) {
    // post
    app.post('/api/newsfeed/post',
        Parsers.JsonParser,
        auth.isAuthorized,
        validatePostSchema,
        createPost);
    app.get('/api/newsfeed/post',
        Parsers.JsonParser,
        auth.isAuthorized,
        getPost)
    app.delete('/api/newsfeed/post',
        Parsers.JsonParser,
        auth.isAuthorized,
        deletePost);
    // comment
    app.post('/api/newsfeed/comment',
        Parsers.JsonParser,
        auth.isAuthorized,
        validateCommentSchema,
        createComment);
    app.get('/api/newsfeed/comment',
        Parsers.JsonParser,
        auth.isAuthorized,
        getComment);
    app.delete('/api/newsfeed/comment',
        Parsers.JsonParser,
        auth.isAuthorized,
        deleteComment);
    // like
    app.post('/api/newsfeed/like',
        Parsers.JsonParser,
        auth.isAuthorized,
        toggleLike);

}
sm.registerModule(exports);
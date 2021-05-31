require('dotenv').config();
const testVariables = require('./server.test').testVariables; // require the previous test
const { describe } = require('mocha');
const { expect } = require('chai');
const { meow } = require('../service/meow');
var root = 'http://' + process.env.MEOW_SERVER_ADDRESS + ':' + process.env.MEOW_SERVER_PORT;
console.log(root);
const postKeys = [
    "id",
    "sharedPostId",
    "userId",
    "content",
    "timestamp",
    "sharesCount",
    "likesCount",
    "commentsCount",
];
const commentKeys = [
    "id",
    "postId",
    "userId",
    "content",
    "timestamp",
    "likesCount",
];
const authResponseKeys = [
    'idToken',
    'refreshToken',
    'localId',
    'expiresIn',
    'email'
];
const userKeys = [
    'id',
    'email',
    'username',
    'displayName',
    'displayImageUrl',
    'registrationTimestamp',
    'followersCount',
    'followingsCount',
    'bio',
    'birthdate',
    'location',
];


describe('Meow', () => {
    it('Initialize Meow', () => {
        expect(testVariables.isServerUp).equals(true, 'Server is down');
        meow.initialize({
            root: root
        });
    });

    it('Sign in with wrong credentials', () => {
        expect(testVariables.isServerUp).equals(true, 'Server is down');
        meow.auth.signIn('not-existing-account', 'not-a-password').then(x => {
            expect(false, 'A response is not expected!').equals(true);
        }).catch(err => {
            expect(err.message).equals('WRONG_CREDENTIALS');
        });
    });

    it('Throw error when expired token', () => {
        expect(testVariables.isServerUp).equals(true, 'Server is down');
        meow.auth.getUserData(testVariables.expiredIdToken).then(x => {
            expect(false, 'A response is not expected!').equals(true);
        }).catch(err => {
            expect(err.message).equals('EXPIRED_ID_TOKEN');
        });
    });

    it('Throw error when refreshing with expired refresh token', () => {
        expect(testVariables.isServerUp).equals(true, 'Server is down');
        meow.auth.refreshIdToken(testVariables.expiredRefreshToken).then(x => {
            expect(false, 'A response is not expected!').equals(true);
        }).catch(err => {
            expect(err.message).equals('EXPIRED_REFRESH_TOKEN');
        });
    });


    it('Get user data with expired token', () => {
        expect(testVariables.isServerUp).equals(true, 'Server is down');
        meow.auth.getUserData(testVariables.expiredIdToken).then(x => {
            expect(false, 'A response is not expected!').equals(true);
        }).catch(err => {
            expect(err.message).equals('EXPIRED_ID_TOKEN');
        });
    });

    it('Sign in with wrong credentials', () => {
        expect(testVariables.isServerUp).equals(true, 'Server is down');
        meow.auth.signIn('not-existing-account', 'not-a-password').then(x => {
            expect(false, 'A response is not expected!').equals(true);
        }).catch(err => {
            expect(err.message).equals('WRONG_CREDENTIALS');
        });
    });
    it('Sign up with email / password', async () => {
        expect(testVariables.isServerUp).equals(true, 'Server is down');
        const response = await meow.auth.signUp('test' + (Math.floor(Math.random() * 100000)) + '@t.t', 'test_password', 'Testing', 'Testing Account');
        expect(response).keys(authResponseKeys);
        testVariables['lastRegisteredPassword'] = 'test_password';
        testVariables['lastRegisteredEmail'] = response.email;
        testVariables['lastIdToken'] = response.idToken;
        testVariables['lastRefreshToken'] = response.refreshToken;
        testVariables['lastAuthId'] = response.localId;
    });

    it('Sign in with email / password', async () => {
        expect(testVariables.isServerUp).equals(true, 'Server is down');
        const response = await meow.auth.signIn(testVariables.lastRegisteredEmail, testVariables.lastRegisteredPassword);
        expect(response).keys(authResponseKeys);
    });

    it('Get user data', async () => {
        expect(testVariables.isServerUp).equals(true, 'Server is down');
        const userData = await meow.auth.getUserData();
        expect(userData).keys(userKeys);
    });
    it('Refresh id token', () => {
        expect(testVariables.isServerUp).equals(true, 'Server is down');
        meow.auth.refreshIdToken(testVariables.lastIdToken).then(response => {
            expect(response).keys(authResponseKeys);
        }).catch(err => {
            expect(false, 'Was not expecting an error!').equals(true);
        });
    });

    it('Get newsfeed posts', async () => {
        expect(testVariables.isServerUp).equals(true, 'Server is down');
        const response = await meow.newsfeed.getNewsfeedPosts();
        expect(Array.isArray(response)).equals(true);
        response.forEach(post => {
            expect(post).keys(postKeys);
        });
    });

    it('Create a post', async () => {
        expect(testVariables.isServerUp).equals(true, 'Server is down');
        const post = await meow.newsfeed.createPost('Post!');
        expect(post).keys([
            "id",
            "sharedPostId",
            "userId",
            "content",
            "timestamp",
            "sharesCount",
            "likesCount",
            "commentsCount",
        ]);
        testVariables.lastCreatedPostId = post.id;
    });

    it('Get a post by id', async () => {
        expect(testVariables.isServerUp).equals(true, 'Server is down');
        const post = await meow.newsfeed.getPost(testVariables.lastCreatedPostId);
        expect(post).keys(postKeys);
    });

    it('Create comment', async () => {
        expect(testVariables.isServerUp).equals(true, 'Server is down');
        const comment = await meow.newsfeed.createComment(testVariables.lastCreatedPostId, 'Comment!');
        expect(comment).keys(commentKeys);
        testVariables.lastCreatedCommentId = comment.id;
    });

    it('Get comment', async () => {
        expect(testVariables.isServerUp).equals(true, 'Server is down');
        const comment = await meow.newsfeed.getComment(testVariables.lastCreatedPostId, testVariables.lastCreatedCommentId);
        expect(comment).keys(commentKeys);
    });
    
    it('Create 10 comments', async () => {
        expect(testVariables.isServerUp).equals(true, 'Server is down');
        for (let i = 0; i < 10; i++) {
            const comment = await meow.newsfeed.createComment(testVariables.lastCreatedPostId, 'Comment!');
            expect(comment).keys([
                "id",
                "postId",
                "userId",
                "content",
                "timestamp",
                "likesCount",
            ]);
            testVariables.lastCreatedCommentId = comment.id;
        }
    });


    it('Get post comments', async () => {
        expect(testVariables.isServerUp).equals(true, 'Server is down');
        const comments = await meow.newsfeed.getPostComments(testVariables.lastCreatedPostId);
        expect(Array.isArray(comments), 'Is array').equals(true);
        comments.forEach(comment => {
            expect(comment).keys(commentKeys);
        });
    });

    it('Get post comments after a timestamp', async () => {
        expect(testVariables.isServerUp).equals(true, 'Server is down');
        const timestamp = 1622474368;
        const comments = await meow.newsfeed.getPostComments(testVariables.lastCreatedPostId, { after: timestamp });
        expect(Array.isArray(comments), 'Is array').equals(true);
        comments.forEach(comment => {
            expect(comment).keys(commentKeys);
            expect(comment.timestamp).greaterThan(timestamp);
        });
    });

    it('Get post comments before a timestamp', async () => {
        expect(testVariables.isServerUp).equals(true, 'Server is down');
        const timestamp = Math.floor(Date.now() / 1000);
        const comments = await meow.newsfeed.getPostComments(testVariables.lastCreatedPostId, { before: timestamp });
        expect(Array.isArray(comments), 'Is array').equals(true);
        comments.forEach(comment => {
            expect(comment).keys(commentKeys);
            expect(comment.timestamp).lessThan(timestamp);
        });
    });


    it('Get user posts', async () => {
        expect(testVariables.isServerUp).equals(true, 'Server is down');
        const posts = await meow.people.getUserPosts(meow.auth.user.id);
        expect(Array.isArray(posts), 'Is array').equals(true);
        posts.forEach(posts => {
            expect(posts).keys(postKeys);
        });
    });

    // Delete testing data before finishing the test
    it('Delete comment', async () => {
        expect(testVariables.isServerUp).equals(true, 'Server is down');
        const comment = await meow.newsfeed.deleteComment(testVariables.lastCreatedPostId, testVariables.lastCreatedCommentId);
        expect(comment).equals(null);
    });

    it('Delete post', async () => {
        expect(testVariables.isServerUp).equals(true, 'Server is down');
        const post = await meow.newsfeed.deletePost(testVariables.lastCreatedPostId);
        expect(post).equals(null);
    });



    it('Delete Account', async () => {
        expect(testVariables.isServerUp).equals(true, 'Server is down');
        const response = await meow.auth.deleteAccount();
        expect(response).equals(null);
    });
});

exports.testVariables = testVariables;





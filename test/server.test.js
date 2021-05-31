
require('dotenv').config();
const fetch = require('node-fetch/lib/index')
const { describe } = require('mocha');
const { expect } = require('chai');
var root = 'http://' + process.env.MEOW_SERVER_ADDRESS + ':' + process.env.MEOW_SERVER_PORT;
console.log(root);
const testVariables = {
    deletedUserIdToken: undefined,
    deletedUserRefreshToken: undefined,
    wrongPasswordRefreshToken: undefined,
    expiredIdToken: undefined,
    expiredRefreshToken: undefined,
    validIdToken: undefined,
    validRefreshToken: undefined,
};
describe('Server', () => {
    it('Is up', async () => {
        testVariables.isServerUp = false;
        let optionsResponse = await fetch(root, {
            method: 'OPTIONS'
        });
        expect(optionsResponse.status).to.equal(200);
        testVariables.isServerUp = true;

    });
    it('Fetch auth testing tokens', async () => {
        expect(testVariables.isServerUp).equals(true, 'Server is down');
        const response = await fetch(root + '/api/auth/test', { method: 'GET' });
        let body = await response.clone().json();
        expect(body).keys([
            'deletedUserIdToken',
            'deletedUserRefreshToken',
            'expiredIdToken',
            'expiredRefreshToken',
            'idToken',
            'refreshToken',
            'wrongPasswordRefreshToken',
        ]);

        testVariables.deletedUserIdToken = body.deletedUserIdToken;
        testVariables.deletedUserRefreshToken = body.deletedUserRefreshToken;
        testVariables.wrongPasswordRefreshToken = body.wrongPasswordRefreshToken;
        testVariables.expiredIdToken = body.expiredIdToken;
        testVariables.expiredRefreshToken = body.expiredRefreshToken;
        testVariables.validIdToken = body.idToken;
        testVariables.validRefreshToken = body.refreshToken;


    });
})

exports.testVariables = testVariables;





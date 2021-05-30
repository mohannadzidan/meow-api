
/**
 * @typedef {Object} MeowAuthenticationResponse
 * @property {string} idToken 
 * @property {string} refreshToken
 * @property {string} email
 * @property {number} localId
 * @property {number} expiresIn
 */
/**
 * @typedef {Object} MeowUser
 * @property {number} id 
 * @property {string} email
 * @property {string} username
 * @property {string} displayName
 * @property {string} displayImageUrl
 * @property {number} registrationTimestamp
 * @property {number} followersCount
 * @property {number} followingsCount
 */
/**
 * @typedef {Object} MeowConfiguration
 * @property {string} root 
 */
/**
 * @type MeowConfiguration
 */
const config = {};



const auth = {
    root: config.root + '/auth/',
    idToken: undefined,
    /**
     * 
     * @param {string} email 
     * @param {string} password 
     * @param {string} username 
     * @param {string} displayName 
     * @return {Promise<MeowAuthenticationResponse>}
     */
    async signUp(email, password, username, displayName) {
        const response = await fetch({
            method: 'POST',
            url: this.root + 'accounts:signUp',
            headers: [{ 'Content-Type': 'application/json' }],
            body: {
                email: email,
                password: password,
                username: username,
                displayName: displayName
            }
        });
        if (response.status === 201) {
            return response.json();
        }
        return Promise.reject(await response.json());
    },

    async deleteAccount(){
        const response = await fetch({
            method: 'POST',
            url: this.root + 'accounts:signUp',
            headers: [{ 'Content-Type': 'application/json' }],
            body: {
                email: email,
                password: password,
                username: username,
                displayName: displayName
            }
        });
        if (response.status === 201) {
            return response.json();
        }
        return Promise.reject(await response.json());
    }
}
const auth = {




    getUserData: function () {

    }
}
const posts = {
    create: function (content) {

    }
}
function buildURL(root, extension, ...params) {

}

class Meow {
    /**
     * 
     * @param {String} hostUrl api root url 
     */
    constructor(hostUrl) {
        this.hostUrl = hostUrl;
    }

    function(params) {

    }
}


function initializeApp(config) {

}

exports.meow = {
    auth: auth,
};
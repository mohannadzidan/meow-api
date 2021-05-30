const Errors = {
    EMAIL_ALREADY_EXISTS: {
        code: 409,
        message: 'EMAIL_ALREADY_EXISTS'
    },
    USERNAME_ALREADY_EXISTS: {
        code: 409,
        message: 'USERNAME_ALREADY_EXISTS'
    },
    NOT_FOUND: {
        code: 404,
        message: 'NOT_FOUND'
    },
    USER_NOT_FOUND: {
        code: 404,
        message: 'USER_NOT_FOUND'
    },
    POST_NOT_FOUND: {
        code: 404,
        message: 'POST_NOT_FOUND'
    },
    COMMENT_NOT_FOUND: {
        code: 404,
        message: 'COMMENT_NOT_FOUND'
    },
    BAD_REQUEST: {
        code: 400,
        message: 'BAD_REQUEST'
    },
    UNAUTHORIZED: {
        code: 401,
        message: 'UNAUTHORIZED'
    },
    WRONG_CREDENTIALS: {
        code: 409,
        message: 'WRONG_CREDENTIALS'
    },
    INTERNAL_ERROR: {
        code: 500,
        message: 'INTERNAL_ERROR'
    },
    PERMISSION_DENIED: {
        code: 403,
        message: 'PERMISSION_DENIED'
    },
    Value: {
        VALUE_IS_VERY_LONG: {
            code: 400,
            message: 'VALUE_IS_VERY_LONG'
        },
        VALUE_IS_VERY_SHORT: {
            code: 400,
            message: 'VALUE_IS_VERY_SHORT'
        },
        WRONG_VALUE_TYPE: {
            code: 400,
            message: 'WRONG_VALUE_TYPE'
        },
        VALUE_IS_REQUIRED: {
            code: 400,
            message: 'VALUE_IS_REQUIRED'
        },
        VALUE_IS_UNKNOWN: {
            code: 400,
            message: 'VALUE_IS_UNKNOWN'
        },
    },
    Token: {
        INVALID_ID_TOKEN: {
            code: 401,
            message: 'INVALID_ID_TOKEN'
        },
        EXPIRED_ID_TOKEN: {
            code: 401,
            message: 'EXPIRED_ID_TOKEN'
        },
        INVALID_REFRESH_TOKEN: {
            code: 401,
            message: 'INVALID_REFRESH_TOKEN'
        },
        ID_TOKEN_REQUIRED: {
            code: 401,
            message: 'ID_TOKEN_REQUIRED'
        },
    },
}

/**
 * 
 * @param {import('express').Response} res 
 * @param {*} error 
 * @param {string} message
 */
function respondWithError(res, error, meta = undefined) {
    if (meta) {
        error = { ...error, meta: meta }
    }
    res.status(error.code).send(error);
}
/**
 * 
 * @param {import('express').Response} res 
 * @param {*} err 
 */
function handleInternalError(res, err) {
    res.status(500).send(Errors.INTERNAL_ERROR);
    console.error(err);
}

function handleTokenError(res, err, type) {
    if (err.name === 'TokenExpiredError')
        res.status(401).send({ code: 'EXPIRED_' + type.toUpperCase() + '_TOKEN', message: err.message });
    else
        res.status(401).send({ code: 'INVALID_' + type.toUpperCase() + '_TOKEN', message: err.message });
}

exports.handleInternalError = handleInternalError;
exports.handleTokenError = handleTokenError;
exports.respondWithError = respondWithError;
exports.Errors = Errors;
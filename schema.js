const { respondWithError, Errors } = require("./errors");

var ErrorCodes = {
    TOO_LONG: 'TOO_LONG',
    TOO_SHORT: 'TOO_SHORT',
    TYPE_MISMATCH: 'TYPE_MISMATCH',
    MISSING_VALUE: 'MISSING_VALUE',
    UNKNOWN_VALUE: 'UNKNOWN_VALUE',
    MULTIPLE_ERRORS: 'MULTIPLE_ERRORS',
}

exports.ErrorCodes = ErrorCodes;


function validateObject(obj, schema) {
    if(schema.strict === true){
        for (const [key, objValue] of Object.entries(obj)) {
            if(schema.properties[key] === undefined)
                return false;
        }
    }
    // validate each schema value
    for (const [key, schemaValue] of Object.entries(schema.properties)) {
        const isOptional = schemaValue.optional === true;
        // check if optional
        if (obj[key] === undefined && isOptional)
            continue;
        else if (obj[key] === undefined) {
            return false;
        }
        // check type
        if (typeof obj[key] !== schemaValue.type) {
            return false;
        }
        // check maxLength
        if (typeof obj[key] === 'string' && schemaValue.maxLength !== undefined && obj[key].length > schemaValue.maxLength) {
            return false;
        }
        // check minLength
        if (typeof obj[key] === 'string' && schemaValue.minLength !== undefined && obj[key].length < schemaValue.minLength) {
            return false;

        }
    }
    return true;
}
/**
 * 
 * @param {*} req 
 * @param {*} res 
 * @param {*} schema 
 * @returns 
 */
function requirePostBody(req, res, schema) {
    const obj = req.body;
    if(schema.strict === true){ 
        // check against unknown properties in the request body 
        for (const [key, objValue] of Object.entries(obj)) {
            if(schema.properties[key] === undefined){
                respondWithError(res, Errors.Value.VALUE_IS_UNKNOWN, {target: key});
                return false;
            }
        }
    }
    // validate each schema value
    for (const [key, schemaValue] of Object.entries(schema.properties)) {
        const isOptional = schemaValue.optional === true;
        // check if optional
        if (obj[key] === undefined && isOptional)
            continue;
        else if (obj[key] === undefined) {
            respondWithError(res, Errors.Value.VALUE_IS_REQUIRED, {target: key});
            return false;
        }
        // check type
        if (typeof obj[key] !== schemaValue.type) {
            respondWithError(res, Errors.Value.WRONG_VALUE_TYPE, {target: key});
            return false;
        }
        // check maxLength
        if (typeof obj[key] === 'string' && schemaValue.maxLength !== undefined && obj[key].length > schemaValue.maxLength) {
            respondWithError(res, Errors.Value.VALUE_IS_VERY_LONG, {target: key});
            return false;
        }
        // check minLength
        if (typeof obj[key] === 'string' && schemaValue.minLength !== undefined && obj[key].length < schemaValue.minLength) {
            respondWithError(res, Errors.Value.VALUE_IS_VERY_SHORT, {target: key});
            return false;
        }
    }
    return true;
}

/**
 * @deprecated
 */
function validateJsonSchema(schema) {
    return (req, res, next) => {
        if (req.body === undefined) {
            respondWithError(res, Errors.BAD_REQUEST);
            return;
        }
        if (requirePostBody(res, req, schema)) next();
    }
}

exports.validateJsonSchema = validateJsonSchema;
exports.validateObject = validateObject;
exports.requireRequestBody = requirePostBody;
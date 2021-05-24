
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
    // validate each schema value
    for (const [key, schemaValue] of Object.entries(schema)) {

        // check if optional
        if (obj[key] === undefined && schemaValue.optional === true) continue;
        if (obj[key] === undefined && schemaValue.optional !== true) {
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

exports.validateJsonSchema = function (schema) {
    return (req, res, next) => {
        if (req.body === undefined || !validateObject(req.body, schema)) {
            res.status(400).send();
            return;
        }
        next();
    }
}


exports.validateObject = validateObject;
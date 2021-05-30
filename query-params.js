const { respondWithError, Errors, handleInternalError } = require('./errors');

/**
  * 
  * @param {import('express').Request} req 
  * @param {import('express').Response} res 
  * @param {Function} next
  */
exports.convertParams = function (paramTypes) {
    return (req, res, next) => {
        for (const [key, paramValue] of Object.entries(req.query)) {
            const type = paramTypes[key];
            if (type) {
                const converter = converters[type]
                if (!converter) {
                    handleInternalError(res, new Error('The required type (' + type + ') isn\'t supported!'));
                    return;
                }
                const convertedValue = converter(paramValue);
                if (convertedValue === undefined) {
                    respondWithError(res, Errors.BAD_REQUEST, `Query parameter "${key}" isn't of type "${type}"`)
                    return;
                }
                req.query[key] = convertedValue;
            }
        }
        next();
    }
}

const converters = {
    integer: function (value) {
        const integer = Number.parseInt(value);
        if (Number.isNaN(integer)) {
            return undefined;
        }
        return integer;
    },
    string: function (value) {
        if(typeof value === 'string') return value;
        return new String(value);
    }
}

function convertParam(paramName, type) {
    const converter = converters[type];
    if (!converter)
        throw new Error('The required type (' + type + ') isn\'t supported!');
    return (req, res, next) => {
        const param = req.query[paramName];
        if (param) {
            req.query[paramName] = converter(param);
        }
        next();
    }
}
/**
 * 
* @param {import('express').Request} req 
 * @param {*} paramsDescriptor 
 * @returns success or failed
 */
function requireParams(req, res, paramsDescriptor) {
    for (let [paramName, requiredType] of Object.entries(paramsDescriptor)) {
        const isOptional = requiredType.endsWith('?');
        if (isOptional) requiredType = requiredType.substring(0, requiredType.length - 1);
        const converter = converters[requiredType];
        if (!converter)
            throw new Error('The required type (' + requiredType + ') isn\'t supported!');
        if (req.query[paramName] !== undefined) {
            const convertedValue = converter(req.query[paramName]);
            if (convertedValue === undefined) {
                respondWithError(res, Errors.BAD_REQUEST, `The query param "${paramName}" is required to be of type ${requiredType}!`);
                return false;
            }
            req.query[paramName] = convertedValue;
        }
        if (req.query[paramName] === undefined && !isOptional) {
            respondWithError(res, Errors.BAD_REQUEST, `The query param "${paramName}" is required to be of type ${requiredType}!`);
            return false;
        }
    }
    return true;
}
exports.converters = converters;
exports.convertParam = convertParam;
exports.requireParams = requireParams;
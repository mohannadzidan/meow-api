
/**
 * 
 * @param {string} param 
 * @param {Object} object 
 * @returns 
 */
function routeObjectFunctions(param, object) {
    return (req, res, next) => {
        const f = req.params[param];
        if (typeof object[f] === 'function') {
            object[f](req, res, next)
        } else {
            res.status(404).send();
        }
    }
}

/**
 * 
 * @param {import('express').Request} req 
 * @param {import('express').Response} res 
 * @param {Function} next 
 */
function respondsWithJson(req, res, next) {
    res.header('Content-Type', 'application/json');
    next();
}

exports.respondsWithJson = respondsWithJson;
exports.routeObjectFunctions = routeObjectFunctions;
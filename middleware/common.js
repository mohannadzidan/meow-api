
/**
 * 
 * @paramName {string} paramName 
 * @param {Object} object 
 * @returns 
 */
function routeObjectFunctions(paramName, object) {
    return (req, res, next) => {
        const f = req.params[paramName];
        if (typeof object[f] === 'function') {
            object[f](req, res, next)
        } else {
            res.status(404).json();
        }
    }
}

exports.routeObjectFunctions = routeObjectFunctions;
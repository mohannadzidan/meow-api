
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
            res.status(404).json();
        }
    }
}

exports.routeObjectFunctions = routeObjectFunctions;
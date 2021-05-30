const { strict } = require('assert');
var fs = require('fs');
var mysqlScripts = {};
readMysqlScripts('./mysql');
function readMysqlScripts(dir) {
    fs.readdirSync(dir).forEach(file => {
        const extIndex = file.lastIndexOf('.');
        if (extIndex === -1) {
            readMysqlScripts(dir + '/' + file);
        } else if (file.substring(extIndex + 1, file.length).toLowerCase() === 'sql') {
            mysqlScripts[file.substring(0, extIndex)] = fs.readFileSync(dir + '/' + file, 'utf8');
        }
    });
}
function escapeValue(value) {
    const type = typeof value;
    if (type === "string") {
        return "'" + value + "'";
    }
    if (Array.isArray(value)) {
        return "(" + value.map(escapeValue).join() + ")";
    }
    if (type === "object") {
        throw 'cannot quote object';
    }
    return value;
}

/**
 * 
 * @param {string} queryName 
 * @param {object} params 
 */
exports.Q = function (queryName, params) {
    const query = mysqlScripts[queryName];
    if(!query) 
        throw 'Unknown query \''+queryName+'\'!';
    let varIndex = query.indexOf('$');
    let varEndIndex = varIndex + 1;
    let injectedQuery = query.substring(0, varIndex === -1 ? query.length : varIndex);
    while (varIndex !== -1) {
        let varName = '';
        for (; varEndIndex < query.length; varEndIndex++) {
            const c = query.charAt(varEndIndex);
            if (!/\w/.test(c)) {

                break;
            };
            varName += c;
        }
        const value = params[varName];
        if (value === undefined)
            throw new Error("value of '" + varName + "' isn't specified!");
        injectedQuery += ' ' + escapeValue(value) + ' ';
        varIndex = query.indexOf('$', varIndex + 1);
        injectedQuery += query.substring(varEndIndex, varIndex === -1 ? query.length : varIndex);
        varEndIndex = varIndex + 1;
    }
    return injectedQuery;
};

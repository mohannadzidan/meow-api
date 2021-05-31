
/**
 * 
 * @param {string} fieldsQueryParameter 
 * @param {*} allowedFieldsMap 
 * @returns {object}
 */
exports.selectSpecificFields = function (fieldsQueryParameter, allowedFieldsMap) {
    if (!fieldsQueryParameter) return undefined;
    const selectionMap = {};
    const requiredFields = fieldsQueryParameter.split(',');
    for (const fieldName of requiredFields) {
        if (!allowedFieldsMap[fieldName]) return undefined;
        selectionMap[fieldName] = true;
    }
    return selectionMap;
}

/**
 * 
 * @param {*} selectionMap 
 * @param {string} tableName 
 * @param  {string[]} currentParams 
 * @returns {string}
 */
exports.selectSpecificFieldsRaw = function (fieldsQueryParameter, allowedFieldsMap, fromTable = undefined) {
    const requiredFields = fieldsQueryParameter.split(',');
    const selections = [];
    for (const fieldName of requiredFields) {
        if (!allowedFieldsMap[fieldName]) return undefined;
        if(fromTable){
            selections.push('`' + fromTable + '`.' + fieldName);
        }else{
            selections.push(fieldName);
        }
    }
    return selections.join(',');
}

const { Errors } = require("./errors");

/**
 * @typedef {Object} FieldsSelection
 * @property {*} select
 * @property {number} limit
 */
/** 
 * 
 * @param {string} fields 
 * @param {string[]} allowedFieldsArray 
 * @param {limit} limit 
 * @param {string} tableName 
 * @returns {FieldsSelection}
 */

function selectSpecificFields(queryParams, allowedFieldsMap, limit) {
    const fields = queryParams.fields;
    const sameLimit = queryParams.same_limit === 'true';
    if (!fields) {
        return {
            limit: limit,
        }
    }
    const selectionMap = {};
    const requiredFields = fields.split(',');
    for (const fieldName of requiredFields) {
        if (!allowedFieldsMap[fieldName]) throw Errors.BAD_REQUEST;
        selectionMap[fieldName] = true;
    }
    if (requiredFields.length === 1 && !sameLimit) limit *= 10;
    return {
        isSingleField: requiredFields.length === 1,
        limit: limit,
        select: selectionMap,
    };
}
/** 
 * 
 * @param {string} fields 
 * @param {string[]} allowedFieldsArray 
 * @param {limit} limit 
 * @param {string} tableName 
 * @returns {FieldsSelection}
 */
function selectSpecificFieldsRaw(queryParams, allowedFieldsMap, limit, tableName = undefined) {
    const fields = queryParams.fields;
    const sameLimit = queryParams.same_limit === 'true';
    if (!fields) {
        return {
            limit: limit,
            select: tableName ? '`' + tableName + '`.*' : '*',
        }
    }
    const requiredFields = fields.split(',');
    const selections = [];
    for (const fieldName of requiredFields) {
        if (!allowedFieldsMap[fieldName]) throw Errors.BAD_REQUEST;
        if (tableName) {
            selections.push('`' + tableName + '`.' + fieldName);
        } else {
            selections.push(fieldName);
        }
    }
    if (requiredFields.length === 1 && !sameLimit) limit *= 10;
    return {
        limit: limit,
        select: selections.join(','),
        isSingleField: requiredFields.length === 1,

    }
}
exports.selectSpecificFieldsRaw = selectSpecificFieldsRaw;
exports.selectSpecificFields = selectSpecificFields;

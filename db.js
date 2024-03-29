var mysql = require('mysql');
var { PrismaClient } = require('@prisma/client');
var prisma = new PrismaClient();
function twoDigits(d) {
    if (0 <= d && d < 10) return "0" + d.toString();
    if (-10 < d && d < 0) return "-0" + (-1 * d).toString();
    return d.toString();
}
Date.prototype.toMySQLFormat = function () {
    return this.getUTCFullYear() + "-" + twoDigits(1 + this.getUTCMonth()) + "-" + twoDigits(this.getUTCDate()) + " " + twoDigits(this.getUTCHours()) + ":" + twoDigits(this.getUTCMinutes()) + ":" + twoDigits(this.getUTCSeconds());
};
exports.db = prisma;

exports.PrismaErrorCodes = {
    UNIQUE_CONSTRAINT_FAILED: 'P2002',
    FOREIGN_KEY_CONSTRAINT_FAILED: 'P2003'
}
var mysql = require('mysql');
function Q() {
    // select * from `user` where id = 5;
    let query = [];


    const terminatingOptions = {
        build: () => {
            return query.join(' ') + ';';
        },
        orderBy: (column, order = 'ASC') => {
            query.push('ORDER BY');
            query.push(`\`${column}\``);
            query.push(order);
            return {
                limit: (count, offset = 0) => {
                    query.push('LIMIT');
                    query.push(offset);
                    query.push(',');
                    query.push(count);
                    return terminatingOptions;
                },
                ...terminatingOptions,
            }

        },
        groupBy: (column) => {
            query.push('GROUP BY');
            query.push(`\`${column}\``);
            return {
                build: terminatingOptions.build,
                orderBy: terminatingOptions.orderBy,
            };
        }
    };
    const where = (lfs, op, rhs) => {
        query.push('WHERE');
        query.push(lfs);
        query.push(op);
        if (Array.isArray(rhs)) {
            query.push('(' + rhs.map(mysql.escape).join(',') + ')');
        } else {
            query.push(mysql.escape(rhs));
        }
        return conditionOptions;
    }
    const conditionOptions = {
        and: (lfs, op, rhs) => {
            query.push('AND');
            mysql.escape(lfs)
            query.push(op);
            if (Array.isArray(rhs)) {
                query.push('(' + rhs.map(mysql.escape).join(',') + ')');
            } else {
                query.push(mysql.escape(rhs));
            }
            return conditionOptions;
        },
        or: (lfs, op, rhs) => {
            query.push('OR');
            query.push(lfs);
            query.push(op);
            if (Array.isArray(rhs)) {
                query.push('(' + rhs.map(mysql.escape).join(',') + ')');
            } else {
                query.push(mysql.escape(rhs));
            }
            return conditionOptions;
        },


        ...terminatingOptions
    }

    const selectOptions = {
        from: (table) => {
            query.push('FROM `' + table + '`');
            return {
                innerJoin: (table) => {
                    query.push('INNER JOIN');
                    query.push('`' + table + '`');
                    return {
                        on: (lfs, op, rhs) => {
                            query.push('ON');
                            query.push(lfs);
                            query.push(op);
                            query.push(rhs);
                            return { ...conditionOptions, where: where };
                        }
                    };
                },
                where: where,
            }
        },
        as: (alias) => {
            query.push('AS');
            query.push(alias);
            return {
                andSelect: selectOptions.andSelect,
                from: selectOptions.from,
            };
        },
        andSelect: (value) => {
            query.push(',' + value);
            return selectOptions;
        },
    };

    const select = (value = '*') => {
        query.push('SELECT');
        query.push(value);
        return selectOptions;
    };
    return {
        select: select,
        insertInto: (table, columns = undefined) => {
            query.push('INSERT INTO');
            query.push('`' + table + '`');
            if (columns) {
                query.push('(' + columns.map(x => `\`${x}\``).join(',') + ')');
            }
            return {
                select: select,
                values: (values) => {
                    query.push('(' + values.map(mysql.escape).join(',') + ')');
                    return terminatingOptions;
                }
            }
        },
        deleteFrom: (table) => {
            query.push('DELETE FROM');
            query.push(`\`${table}\``);
            return {
                ...terminatingOptions,
                where: where,
            }
        },
        deleteFrom: (table) => {
            query.push('DELETE FROM');
            query.push(`\`${table}\``);
            return {
                ...terminatingOptions,
                where: where,
            }
        }
    };
}

exports.Q = Q;
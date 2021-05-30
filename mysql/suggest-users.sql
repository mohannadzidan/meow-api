SELECT 
    user_view.*,
    GROUP_CONCAT(follow.firstId) AS connections,
    COUNT(id) AS connectionsCount
FROM
    follow
        INNER JOIN
    user_view ON user_view.id = follow.secondId
WHERE
    user_view.id NOT IN (${followingsIdSet})
        AND follow.firstId IN (${followingsIdSet})
GROUP BY id;
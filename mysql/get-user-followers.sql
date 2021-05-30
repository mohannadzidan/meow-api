SELECT user_view.* 
FROM follow INNER JOIN user_view ON follow.firstId = user_view.id 
WHERE secondId = ${user}
LIMIT ${offset}, ${count};
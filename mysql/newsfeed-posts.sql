SELECT 
	*,
	EXISTS( SELECT uid FROM `like` WHERE userUid = @userUid AND itemUid = p.uid) AS liked,
    (select 
    
     JSON_ARRAYAGG(
		JSON_OBJECT(
			'uid', uid, 
			'userUid', userUid, 
			'postUid', postUid, 
			'timestamp', timestamp, 
			'content', content,
			'likes', (SELECT COUNT(`like`.uid) FROM `like` WHERE itemUid = comment.uid),
			'liked', EXISTS( SELECT uid FROM `like` WHERE userUid = @userUid AND itemUid = comment.uid)
		)
	) 
	from
		comment
	where
		postUid = p.uid
	order by timestamp desc
	limit 3) as commentsSnapshot
FROM
	post p
WHERE
	p.userUid IN (select secondUserUid from follow where firstUserUid = @userUid) and timestamp < @timestamp
ORDER BY timestamp DESC limit 10;
        

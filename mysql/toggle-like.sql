 SELECT  
    
	comment;
    if(EXISTS(select uid from post where post.uid = itemUid), (select likes from post where post.uid = itemUid), (select likes from comment where comment.uid = itemUid)) as likes,
    SELECT uid FROM `like` WHERE useruid = @userUid AND itemUid = @itemUid) AS likeUid,
    IF(EXISTS(SELECT uid FROM post WHERE  uid = '${req.query.uid}'), 
        'post'
    , IF(EXISTS(SELECT uid
            FROM   comment
            WHERE  uid = '${req.query.uid}'), 'comment',
    NULL)) AS itemType
;

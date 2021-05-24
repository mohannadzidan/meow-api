update 
	post as p 
set
	p.likes = (select count(uid) from `like` where `like`.itemUid = p.uid),
    p.comments = (select count(uid) from comment where comment.postUid = p.uid),
    p.shares = (SELECT c FROM (select count(uid) as c from post where sharedPostUid = p.uid) as x)
;

update 
	comment 
set
	likes = (select count(uid) from `like` where `like`.itemUid = comment.uid)
;

select likes, shares, comments from post order by likes desc;

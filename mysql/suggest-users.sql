select
	user.uid, user.email, user.username, user.displayName, user.displayImageUrl, user.registrationTimestamp,
    COUNT(secondUserUid) as connectionsCount,
	GROUP_CONCAT(firstUserUid) as connections,
	false as followed
from
	follow inner join user on user.uid = follow.secondUserUid
where 
	NOT EXISTS(select uid from follow where firstUserUid = @userUid AND secondUserUid = user.uid) AND
	firstUserUid IN (select secondUserUid from follow where firstUserUid = @userUid)
GROUP BY secondUserUid
order by connectionsCount desc
;

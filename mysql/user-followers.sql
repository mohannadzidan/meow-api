select 
	user.uid, user.email, user.username, user.displayName, user.displayImageUrl, user.registrationTimestamp,
	EXISTS(select uid from follow where firstUserUid = @userUid AND secondUserUid = user.uid) as followed
from 
	follow inner join user on user.uid = follow.firstUserUid
where 
	follow.secondUserUid = @userUid;
limit @offset, @count;

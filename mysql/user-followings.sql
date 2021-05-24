select 
	user.uid, user.email, user.username, user.displayName, user.displayImageUrl, user.registrationTimestamp,
	true as followed
from 
	follow inner join user on user.uid = follow.secondUserUid
where 
	follow.firstUserUid = @userUid
limit @offset, @count;
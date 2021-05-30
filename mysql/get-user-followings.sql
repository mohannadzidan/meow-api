select user_view.* 
from follow inner join user_view on follow.secondId = user_view.id 
where firstId = ${user}
limit ${offset}, ${count};
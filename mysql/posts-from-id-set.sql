SELECT 
    * 
from
    post_view
where 
    userId in ${idSet} and timestamp < ${timestamp}
order by timestamp desc
LIMIT ${count};

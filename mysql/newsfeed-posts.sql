SELECT 
    * 
from
    post_view
where 
    userId in ($idsSet) and timestamp < $timestamp
order by timestamp desc
LIMIT $count;

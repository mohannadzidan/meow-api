SELECT 
    *
FROM 
    post_view 
WHERE 
    timestamp < $timestamp AND userId = $userId 
LIMIT 10; 
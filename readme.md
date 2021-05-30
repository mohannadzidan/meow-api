# Endpoints
The Server provides a number of endpoints (RESFTful endpoints)

## Auth
The authentication is done using JWT encoded id tokens, the token is sent with each request in the header `Authorization: Bearer <ACCESS_TOKEN>`. 
Any request to an endpoint that requires authentication will fail if the id token is not specified, expired or invalid and the response will have `401 UNAUTHORIZED` HTTP status code.

### Sign up with email / password
You can create a new email and password user by issuing an HTTP POST request to the Auth `accounts:signUp` endpoint

**Implemented**
Yes

**Method**
POST

**Content-Type**
application/json

**Endpoint**
```
http/[HOST]/api/auth/accounts:signUp
```

#### Request Body Payload
| Property Name | Type   | Description                        |
| ------------- | ------ | ---------------------------------- |
| email         | string | The email the user signing in with |
| password      | string | The password for the account.      |
| username      | string | The username for the account.      |
| displayName   | string | The display name for the account.  |

#### Response Body Payload
| Property Name | Type   | Description                                          |
| ------------- | ------ | ---------------------------------------------------- |
| idToken       | string | Auth ID token for the authenticated user.            |
| refreshToken  | string | Auth refresh token for the authenticated user.       |
| localId       | number | The uid of the authenticated user.                   |
| expiresIn     | number | The number of seconds in which the ID token expires. |
| email         | string | The email for the authenticated user.                |

A successful request is indicated by a `201 CREATED` HTTP status code.

#### Error Codes
| Code                    | Description                                |
| ----------------------- | ------------------------------------------ |
| EMAIL_ALREADY_EXISTS    | Indicates that the email already exists    |
| USERNAME_ALREADY_EXISTS | Indicates that the username already exists |
| WEAK_PASSWORD           | Indicates that the password is very weak   |

### Sign in with email / password
You can sign in a user with an email and password by issuing an HTTP POST request to the Auth `accounts:signInWithPassword` endpoint.

**Implemented** 
Yes

**Method** 
POST

**Content-Type**
application/json

**Endpoint**
```
http/[HOST]/api/auth/accounts:signInWithPassword
```

#### Request Body Payload
| Property Name | Type   | Description                        |
| ------------- | ------ | ---------------------------------- |
| email         | string | The email the user signing in with |
| password      | string | The password for the account.      |

#### Response Body Payload
| Property Name | Type   | Description                                          |
| ------------- | ------ | ---------------------------------------------------- |
| idToken       | string | Auth ID token for the authenticated user.            |
| refreshToken  | string | Auth refresh token for the authenticated user.       |
| localId       | number | The uid of the authenticated user.                   |
| expiresIn     | number | The number of seconds in which the ID token expires. |
| email         | string | The email for the authenticated user.                |

A successful request is indicated by a `200 OK` HTTP status code.

#### Error Codes
| Code              | Description                                   |
| ----------------- | --------------------------------------------- |
| WRONG_CREDENTIALS | Indicates that email or password is incorrect |

### Exchange refresh token with an ID token
You can refresh an ID token by issuing an HTTP POST request to the Auth `token:refresh` endpoint.

**Implemented**
Yes

**Method**
POST

**Content-Type**
application/json

**Endpoint**
```
http/[HOST]/api/auth/token:refresh
```

#### Request Body Payload
| Property Name | Type   | Description         |
| ------------- | ------ | ------------------- |
| refreshToken  | string | Auth refresh token. |

#### Response Body Payload
| Property Name | Type   | Description                                          |
| ------------- | ------ | ---------------------------------------------------- |
| idToken       | string | Auth ID token for the authenticated user.            |
| refreshToken  | string | Auth refresh token for the authenticated user.       |
| localId       | number | The uid of the authenticated user.                   |
| expiresIn     | number | The number of seconds in which the ID token expires. |
| email         | string | The email for the authenticated user.                |

A successful request is indicated by a `200 OK` HTTP status code.

#### Error Codes
| Code                  | Description                                |
| --------------------- | ------------------------------------------ |
| EXPIRED_REFRESH_TOKEN | Indicates that the user must sign in again |

### Get user data
You can get a user's data by issuing an HTTP POST request to the Auth `accounts:lookup` endpoint.

**Implemented**
Yes

**Method**
POST

**Content-Type**
application/json

**Endpoint**
```
http/[HOST]/api/auth/accounts:lookup
```

#### Request Body Payload
| Property Name | Type   | Description                  |
| ------------- | ------ | ---------------------------- |
| idToken       | string | The ID token of the account. |

#### Response Body Payload
| Property Name         | Type   | Description                                                 |
| --------------------- | ------ | ----------------------------------------------------------- |
| id                    | number | The uid of the current user                                 |
| email                 | string | The email of the account.                                   |
| username              | string | The username for the account.                               |
| displayName           | string | The display name for the account.                           |
| displayImageUrl       | string | The photo Url for the account.                              |
| registrationTimestamp | number | The timestamp, in seconds, that the account was created at. |
| followersCount        | number | Number of users that follow this account                    |
| followingsCount       | number | Number of users that this account follows                   |

A successful request is indicated by a `200 OK` HTTP status code. The response will contain all the user information associated with the account.

#### Error Codes
| Code             | Description                                       |
| ---------------- | ------------------------------------------------- |
| EXPIRED_ID_TOKEN | Indicates that the id token needs to be refreshed |
| INVALID_ID_TOKEN | Indicates that the id is invalid.                 |

### Delete account
You can delete a current user by issuing an HTTP POST request to the Auth `accounts:delete` endpoint

**Implemented**
Yes

**Method**
POST

**Content-Type**
application/json

**Endpoint**
```
http/[HOST]/api/auth/accounts:delete
```

#### Request Body Payload
| Property Name | Type   | Description                         |
| ------------- | ------ | ----------------------------------- |
| idToken       | string | The ID token of the user to delete. |


A successful request is indicated by a `204 NO CONTENT` HTTP status code.

#### Error Codes
| Code             | Description                                       |
| ---------------- | ------------------------------------------------- |
| EXPIRED_ID_TOKEN | Indicates that the id token needs to be refreshed |
| INVALID_ID_TOKEN | Indicates that the id is invalid.                 |

## People

### Get user data by id
You can get user data by issuing an HTTP GET request to the User `users:lookup` endpoint

**Implemented**
Yes

**Authentication**
Required

**Method**
GET

**Content-Type**
application/json

**Endpoint**
```
http/[HOST]/api/people/users:lookup
```
#### id

The `id` request parameter to get user by id
```
http/[HOST]/api/people/users:lookup?id=USER_ID
```

#### username

The `username` request parameter to get user by username
```
http/[HOST]/api/people/users:lookup?username=USERNAME
```

A successful request is indicated by a `200 OK` HTTP status code.

#### Error Codes
| Code             | Description                                       |
| ---------------- | ------------------------------------------------- |
| EXPIRED_ID_TOKEN | Indicates that the id token needs to be refreshed |
| INVALID_ID_TOKEN | Indicates that the id is invalid.                 |
| USER_NOT_FOUND   | _self-explanatory_                                |


### Get user followers
You can get the followers of a user by issuing an HTTP GET request to the People `followers` endpoint

**Implemented**
Yes

**Authentication**
Required

**Method**
GET

**Content-Type**
application/json

**Endpoint**
```
http/[HOST]/api/people/:USER_ID/followers
```

#### Response Body Payload 

```json
{
    "56": true,
    "75": true,
    "48": true,
    ...
    "35": true
}
```

A successful request is indicated by a `200 OK` HTTP status code.

### Get user followings
You can get the followings of a user by issuing an HTTP GET request to the People `followings` endpoint

**Implemented**
Yes

**Authentication**
Required

**Method**
GET

**Content-Type**
application/json

**Endpoint**
```
http/[HOST]/api/people/:USER_ID/followings
```

#### Response Body Payload

```json
{
    "56": true,
    "75": true,
    "48": true,
    ...
    "35": true
}
```

A successful request is indicated by a `200 OK` HTTP status code.

#### Error Codes
| Code             | Description                                       |
| ---------------- | ------------------------------------------------- |
| ID_TOKEN_EXPIRED | Indicates that the id token needs to be refreshed |
| ID_TOKEN_INVALID | Indicates that the id is invalid.                 |
| USER_NOT_FOUND   | _self-explanatory_                                |

### Follow/Un-Follow someone
You can set the follow state of user by issuing an HTTP POST request to the People `followings` endpoint

**Implemented**
No

**Authentication**
Required

**Method**
POST

**Content-Type**
application/json

**Endpoint**
```
http/[HOST]/api/people/:USER_ID/followings/:SECOND_USER_ID
```

#### Request Body Payload
| Property Name | Type    | Description |
| ------------- | ------- | ----------- |
| value         | boolean | The state   |

#### Response Body Payload
| Property Name | Type    | Description   |
| ------------- | ------- | ------------- |
| value         | boolean | The new state |

A successful request is indicated by a `201 OK` HTTP status code.

#### Error Codes
| Code             | Description                                       |
| ---------------- | ------------------------------------------------- |
| ID_TOKEN_EXPIRED | Indicates that the id token needs to be refreshed |
| ID_TOKEN_INVALID | Indicates that the id is invalid.                 |
| USER_NOT_FOUND   | _self-explanatory_                                |

### 1. Toggle follow with POST
### `user`
a user uid must be set as URI parameter `user`, the request toggles the 'follow' state of the user and returns the current state. 
```json
{
    "followed": true
}
```
### 2. Get Followers with GET 
to get the followers of specific user you should set URI parameter `get=followers`, `user` to the user uid and `offset` to some positive offset number (as the endpoint returns only 10 users at a time), if no such a user with the provided user uid, the request will fail with 404 NOT FOUND HTTP status code, and a successful request is indicated by 200 OK HTTP status code. 

### 2. Get Followings with GET 
to get the Followings of specific user you should set URI parameter `get=followings`, `user` to the user id and `offset` to some positive offset number (as the endpoint returns only 10 users at a time), if no such a user with the provided user id, the request will fail with 404 NOT FOUND HTTP status code, and a successful request is indicated by 200 OK HTTP status code. 

### 3. Get Follow suggestions with GET 
to get follow suggestions of the signed in user you should set URI parameter `get=suggestions` and `offset` to some offset positive number (as the endpoint returns only 10 users at a time), a successful request is indicated by 200 OK HTTP status code. 


## Newsfeed

### Create post
You can create a post by issuing an HTTP POST request to the Newsfeed `posts:create` endpoint

**Implemented**
Yes

**Authentication**
Required

**Method**
POST

**Content-Type**
application/json

**Endpoint**
```
http/[HOST]/api/newsfeed/posts:create
```

#### Request Body Payload (<?> indicates optional)
| Property Name    | Type   | Description                                      |
| ---------------- | ------ | ------------------------------------------------ |
| content          | string | The content of the post                          |
| sharedPostId <?> | string | Id of another post to be embedded with this post |

A successful request is indicated by a `201 CREATED` HTTP status code.

#### Error Codes
| Code                  | Description                                       |
| --------------------- | ------------------------------------------------- |
| EXPIRED_ID_TOKEN      | Indicates that the id token needs to be refreshed |
| INVALID_ID_TOKEN      | Indicates that the id is invalid.                 |
| SHARED_POST_NOT_FOUND | _self-explanatory_                                |

### Delete post
You can delete a post by issuing an HTTP DELETE request to the Newsfeed `posts:delete` endpoint

**Implemented**
Yes

**Authentication**
Required

**Method**
DELETE

**Content-Type**
application/json

**Endpoint**
```
http/[HOST]/api/newsfeed/posts:delete?id=POST_ID
```

A successful request is indicated by a `204 NO CONTENT` HTTP status code.

#### Error Codes
| Code             | Description                                       |
| ---------------- | ------------------------------------------------- |
| EXPIRED_ID_TOKEN | Indicates that the id token needs to be refreshed |
| INVALID_ID_TOKEN | Indicates that the id is invalid.                 |
| POST_NOT_FOUND   | _self-explanatory_                                |

### Get post by id
You can get any post by id by issuing an HTTP GET request to the Newsfeed `posts:lookup` endpoint

**Implemented**
Yes

**Authentication**
Required

**Method**
GET

**Content-Type**
application/json

**Endpoint**
```
http/[HOST]/api/newsfeed/posts:lookup?id=POST_ID
```

#### Response Body Payload
| Property Name | Type   | Description                                        |
| ------------- | ------ | -------------------------------------------------- |
| id            | number | The uid of the post                                |
| sharedPostId  | number | The uid of the original post that this post shared |
| userId        | number | The id of the user that posted this post           |
| content       | string | The content of the post                            |
| timestamp     | number | The timestamp in seconds                           |
| likesCount    | number | the number of likes on this post                   |
| commentsCount | number | the number of comments on this post                |
| sharesCount   | number | the number of shares for this post                 |

A successful request is indicated by a `200 OK` HTTP status code.

#### Error Codes
| Code             | Description                                       |
| ---------------- | ------------------------------------------------- |
| EXPIRED_ID_TOKEN | Indicates that the id token needs to be refreshed |
| INVALID_ID_TOKEN | Indicates that the id is invalid.                 |
| POST_NOT_FOUND   | _self-explanatory_                                |

### Get posts made by user
You can get posts posted by a user (10 posts) by issuing an HTTP GET request to the Newsfeed `posts:from` endpoint

**Implemented**
Yes

**Authentication**
Required

**Method**
GET

**Content-Type**
application/json

**Endpoint**
```
http/[HOST]/api/newsfeed/posts:from?user=USER_ID
```

#### before

The `before` request parameter limits the results to only posts that were created before this timestamp (default value is ***now***).
```
http/[HOST]/api/newsfeed/posts:from?before=TIMESTAMP
```

#### after

The `after` request parameter limits the results to only posts that were created after this timestamp (default value is ***0***).
```
http/[HOST]/api/newsfeed/posts:from?after=TIMESTAMP
```

#### Response Body Payload ( _array[]_ )
| Property Name | Type   | Description                                        |
| ------------- | ------ | -------------------------------------------------- |
| id            | number | The uid of the post                                |
| sharedPostId  | number | The uid of the original post that this post shared |
| userId        | number | The id of the user that posted this post           |
| content       | string | The content of the post                            |
| timestamp     | number | The timestamp in seconds                           |
| likesCount    | number | the number of likes on this post                   |
| commentsCount | number | the number of comments on this post                |
| sharesCount   | number | the number of shares for this post                 |

A successful request is indicated by a `200 OK` HTTP status code.

#### Error Codes
| Code             | Description                                       |
| ---------------- | ------------------------------------------------- |
| EXPIRED_ID_TOKEN | Indicates that the id token needs to be refreshed |
| INVALID_ID_TOKEN | Indicates that the id is invalid.                 |
| USER_NOT_FOUND   | _self_explanatory_                                |


### Get newsfeed posts
You can get posts from people who the user follows by issuing an HTTP GET request to the Newsfeed `posts:newsfeed` endpoint

**Implemented**
Yes

**Authentication**
Required

**Method**
GET

**Content-Type**
application/json

**Endpoint**
```
http/[HOST]/api/newsfeed/posts:newsfeed
```

#### before

The `before` request parameter limits the results to only posts that were created before this timestamp (default value is ***now***).
```
http/[HOST]/api/newsfeed/posts:newsfeed?before=TIMESTAMP
```

#### after

The `after` request parameter limits the results to only posts that were created after this timestamp (default value is ***0***).
```
http/[HOST]/api/newsfeed/posts:newsfeed?after=TIMESTAMP
```

A successful request is indicated by a `200 OK` HTTP status code.

#### Error Codes
| Code             | Description                                       |
| ---------------- | ------------------------------------------------- |
| EXPIRED_ID_TOKEN | Indicates that the id token needs to be refreshed |
| INVALID_ID_TOKEN | Indicates that the id is invalid.                 |

### Create comment
You can create a comment by issuing an HTTP POST request to the Newsfeed `comments:create` endpoint

**Implemented**
Yes

**Authentication**
Required

**Method**
POST

**Content-Type**
application/json

**Endpoint**
```
http/[HOST]/api/newsfeed/comments:create
```

#### Request Body Payload
| Property Name | Type   | Description                |
| ------------- | ------ | -------------------------- |
| postId        | number | The id of the post         |
| content       | string | The content of the comment |

#### Response Body Payload
| Property Name | Type   | Description                |
| ------------- | ------ | -------------------------- |
| id            | number | The id of the comment      |
| postId        | number | The id of the post         |
| userId        | number | The id of the user         |
| content       | string | The content of the comment |
| timestamp     | number | The timestamp in seconds   |

A successful request is indicated by a `201 CREATED` HTTP status code.

#### Error Codes
| Code             | Description                                       |
| ---------------- | ------------------------------------------------- |
| EXPIRED_ID_TOKEN | Indicates that the id token needs to be refreshed |
| INVALID_ID_TOKEN | Indicates that the id is invalid.                 |
| POST_NOT_FOUND   | _self-explanatory_                                |

### Delete comment
You can delete a comment by issuing an HTTP DELETE request to the Newsfeed `comments:delete` endpoint

**Implemented**
Yes

**Authentication**
Required

**Method**
DELETE

**Content-Type**
application/json

**Endpoint**
```
http/[HOST]/api/newsfeed/comments:delete?id=COMMENT_ID
```

A successful request is indicated by a `204 NO CONTENT` HTTP status code.

#### Error Codes
| Code              | Description                                       |
| ----------------- | ------------------------------------------------- |
| EXPIRED_ID_TOKEN  | Indicates that the id token needs to be refreshed |
| INVALID_ID_TOKEN  | Indicates that the id is invalid.                 |
| COMMENT_NOT_FOUND | _self-explanatory_                                |

### Get comment by id
You can get a comment by id by issuing an HTTP GET request to the Newsfeed `comments:lookup` endpoint

**Implemented**
Yes

**Authentication**
Required

**Method**
GET

**Content-Type**
application/json

**Endpoint**
```
http/[HOST]/api/newsfeed/comments:lookup?id=COMMENT_ID
```

#### Response Body Payload
| Property Name | Type   | Description                |
| ------------- | ------ | -------------------------- |
| id            | number | The id of the comment      |
| postId        | number | The id of the post         |
| userId        | number | The id of the user         |
| content       | string | The content of the comment |
| timestamp     | number | The timestamp in seconds   |

A successful request is indicated by a `200 OK` HTTP status code.

#### Error Codes
| Code              | Description                                       |
| ----------------- | ------------------------------------------------- |
| EXPIRED_ID_TOKEN  | Indicates that the id token needs to be refreshed |
| INVALID_ID_TOKEN  | Indicates that the id is invalid.                 |
| COMMENT_NOT_FOUND | _self-explanatory_                                |



### Get comments on a post
You can get comments of some post by issuing an HTTP GET request to the Newsfeed `comments:on` endpoint

**Implemented**
Yes

**Authentication**
Required

**Method**
GET

**Content-Type**
application/json

**Endpoint**
```
http/[HOST]/api/newsfeed/comments:on?post=POST_ID
```

#### before

The `before` request parameter limits the results to only comments made before this timestamp (default value is ***now***).
```
http/[HOST]/api/newsfeed/comments:ofPost?before=TIMESTAMP
```

#### after

The `after` request parameter limits the results to only comments made after this timestamp (default value is ***0***).
```
http/[HOST]/api/newsfeed/comments:ofPost?after=TIMESTAMP
```

#### Response Body Payload ( _array[]_ )
| Property Name | Type   | Description                |
| ------------- | ------ | -------------------------- |
| id            | number | The id of the comment      |
| postId        | number | The id of the post         |
| userId        | number | The id of the user         |
| content       | string | The content of the comment |
| timestamp     | number | The timestamp in seconds   |

A successful request is indicated by a `200 OK` HTTP status code.

#### Error Codes
| Code             | Description                                       |
| ---------------- | ------------------------------------------------- |
| EXPIRED_ID_TOKEN | Indicates that the id token needs to be refreshed |
| INVALID_ID_TOKEN | Indicates that the id is invalid.                 |
| POST_NOT_FOUND   | _self-explanatory_                                |





### Error response
Anytime an error is returned from the server the response will have the following format.

#### Error Response Body Payload
| Property Name | Type   | Description                                                            |
| ------------- | ------ | ---------------------------------------------------------------------- |
| code          | string | Status code                                                            |
| message       | string | What is referenced as 'code' in all the error tables eg POST_NOT_FOUND |
| meta          | object | Meta data related to this error                                        |

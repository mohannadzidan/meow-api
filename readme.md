# Endpoints
The Server provides a number of endpoints (RESFTful endpoints)

## Authentication `/api/auth`
Is done using JWT id token, an authorized request is sent with a header `id-token ` if the token is not specified, expired or invalid the response will have a status of 401 UNAUTHORIZED HTTP status code and an empty body.
| METHOD | Description                              | implemented |
|--------|------------------------------------------|-------------|
|POST    | Authenticate user using email/password   | Yes         |
|GET     | Refresh token-id                         | Partially   |
### 1. Authenticating user with credentials using POST
The credentials is submitted to the server in the request body in the following JSON format.
```json
{
    "email": "email@provider.x (5-64 string)",
    "password": "password (8-64 string)"
}
```
A successful request will be indicated by a 200 OK HTTP status code and the body of the response will be ordinary user data in a addition to a `"token"` property that contains the  `id-token `.
```json
 {
   "uid": "00d24062206944bc9b21aee0522e33a8",
   "email": " rafiqborak327@gamil.com",
   "username": " Rafiq27",
   "displayName": " Rafiq Borak",
   "displayImageUrl": "https://imge/url",
   "token": "VERY LONG TOKEN"
 }
```
if the credentials is incorrect the response will have 409 CONFLICT status code and an empty body. 
### 2. Refresh `id-token` using GET
A request to this endpoint must define the `id-token` and `refresh-token` headers, once the request is processed by the server, the server will respond with the user data that matches this token id in addition to new `refresh-token` and `id-token` if this token is expired, or with the same tokens if the `id-token` ísn't expired.

## Users (`/api/user`)
| METHOD    | Description                   | Authentication | implemented |
|-----------|-------------------------------|----------------|-------------|
|POST       | Creates a new user            | -              | Yes         |
|GET        | Gets a user data              | Required       | Yes         |
|DELETE     | Deletes a user                | Required       | Yes         |
|PATCH,PUT  | Updates user data             | Required       | No          |

### 1. Creating a new user using POST
A successful request will be indicated by a 201 CREATED HTTP status code and the body of the request is JSON and matches the following
```json
{
    "username": "mohannadzidan (1-64 string)",
    "email": "user@bmail.com (5-64 string)",
    "password": "My$ecretPassword123 (8-64 string)",
    "displayName": "Mohannad Zidan (1-64 string)",
    "displayImage": "base64 | null"
}
```
if the request body didn't match the previous schema the response will have 400 BAD REQUEST HTTP status code.

if any of the unique fields (email, username) already exists the response will have 409 CONFLICT HTTP status code and a response body that matches the following
```json
{
    "code":"EMAIL_ALREADY_EXISTS | USERNAME_ALREADY_EXISTS"
}
```

### 2. Retrieving user data using GET
A successful request will be indicated by a 200 OK HTTP status code, and the response will contain user data.

ideal user data will look like this
```json
{
    "uid": "00d24062206944bc9b21aee0522e33a8",
    "email": "rafiqborak327@gamil.com",
    "username": "Rafiq27",
    "displayName": "Rafiq Borak",
    "displayImageUrl": "image-url | null",
    "registrationTimestamp": "2021-05-8 13:21:24.000000"
}
```

####  `uid`
A user data can be retrieved by user uid provided in URI parameter `uid`

####  `username`
A user data can be retrieved by user username provided in URI parameter `username`

### 3. Delete a user using DELETE
An authenticated request sent to this end-point will delete the user of this `id-token`, A successful request will be indicated by a 200 OK HTTP status code,
## Posts (`/api/newsfeed/post`)
| METHOD    | Description                   | Authentication | implemented |
|-----------|-------------------------------|----------------|-------------|
|POST       | Creates a post                | Required       | Yes         |
|GET        | Gets a post                   | Required       | Yes         |
|DELETE     | Deletes a post                | Required       | Yes         |
|PATCH,PUT  | Edits the content of a post   | Required       | No          |
### 1. Creating a post with POST
The body of the request is JSON and matches the following
```json
{
    "sharedPostUid": "uid of another post to be shared | null",
    "content": "the content of the new post (max 350 chars )"
}
```
### 2. Retrieving posts with GET
A successful request will be indicated by a 200 OK HTTP status code, and the response will contain the post data.

An ideal post data will look like this

```json
{
    "uid": "aee36c78c3094eb098e44315cf053f27",
    "sharedPostUid": null,
    "userUid": "ef3b9c0038634112beefa0417c6e4376",
    "content": "This post is amazing!",
    "shares": 1,
    "liked": true,
    "likes": 6,
    "comments": 2,
    "timestamp": "2021-05-08 12:22:32",
    "commentsSnapshot": [ // up to 3 comments
        {
            "uid": "f679153bf1df43cabd8c3bc4f416a02c",
            "liked": true,
            "likes": 2,
            "content": "This is a comment",
            "postUid": "aee36c78c3094eb098e44315cf053f27",
            "userUid": "244a30a177344a82a02a139b5b2fa553",
            "timestamp": "2021-05-8 13:21:24.000000"
        },
        {
            "uid": "e5c1d8d953454bd89c5f03076fdbdef6",
            "liked": false,
            "likes": 0,
            "content": "This is another comment",
            "postUid": "aee36c78c3094eb098e44315cf053f27",
            "userUid": "33f7077715c74039b9a3d921af2a496b",
            "timestamp": "2021-05-8 21:57:16.000000"
        }
    ]
}
```
#### _`no-params`_
When no URI parameters is provided the response body will have the last 10 posts of the newsfeed, posts from the people who the user follows or posts made by the user sorted in descending order based on the timestamp.
####  `uid` 
A single post can be retrieved by uid by providing URI parameter `uid` the response will have status 404 NOT FOUND HTTP if no such a post with this `uid` and a successful request will have a response with a body of the post data in JSON format.

####  `by` 
Last 10 posts of posted by a user can be retrieved by providing the user uid in the URI parameter `by` ,the response will have status 404 NOT FOUND HTTP status code if no such a user with this uid and a successful request will have a response with a body of an array of posts in JSON format.

#### `timestamp`
 Unix epoch time, If multiple posts will be retrieved, this parameter will limit the posts to only posts made before this timestamp 



## Comments (`/api/newsfeed/comment`)
| METHOD    | Description                    | Authentication | implemented |
|-----------|--------------------------------|----------------|-------------|
|POST       | Creates a comment              | Required       | Yes         |
|GET        | Gets a comment                 | Required       | Yes         |
|DELETE     | Deletes a comment              | Required       | Yes         |
|PATCH,PUT  | Updates a comment              | Required       | No          | 
### 1. Creating a comment with POST
The body of the request is JSON and matches the following
```json
{
    "postUid": "uid of post",
    "content": "the content of the comment (max 350 chars )"
}
```
A successful request is indicated by 201 CREATED HTTP status code. if request body doesn't match the above schema the response will fail and indicated by 400 BAD REQUEST HTTP status code, and if no such a post with the provided `"postUid"` the request fails and the response will be indicated with 404 NOT FOUND HTTP status code.

### 2. Retrieving comments with GET
typical comment data will look like this
```json
{
    "uid": "e5c1d8d953454bd89c5f03076fdbdef6",
    "liked": false,
    "likes": 0,
    "content": "This is a comment",
    "postUid": "aee36c78c3094eb098e44315cf053f27",
    "userUid": "33f7077715c74039b9a3d921af2a496b",
    "timestamp": "2021-05-8 21:57:16.000000"
}
```
##### `uid`
A single comment can be retrieved by uid by providing URI parameter `uid` the response will have status 404 NOT FOUND HTTP if no such a comment with this `uid` and a successful request will have a response with a body of the comment data in JSON format.
##### `postUid`
An array of 10 most recent comments on a specific post can be retrieved by providing a post uid in URI parameter `postUid`, a successful response will have 200 OK HTTP status code, and if no such a post with the provided uid the server responds with 404 NOT FOUND HTTP status code.
##### `timestamp`
Unix epoch time, when multiple comments are meant to be retrieved from the server, the URI parameter `timestamp` can be provided to limit the results to only the comments that were made before this timestamp.
## Follow (`/api/follow`)
| METHOD    | Description                              | Authentication | implemented |
|-----------|------------------------------------------|----------------|-------------|
|POST       | Toggle follow state for a user           | Required       | Yes         |
|GET        | Get followers, followings or suggestions | Required       | Yes         |

### 1. Toggle follow with POST
#### `uid`
a user uid must be provided as URI paremeter `user`, the request toggles the state of following the user and returns the current state. 
```json
{
    "userUid": "33f7077715c74039b9a3d921af2a496b",
    "followed": true
}
```
### 2. Get Followers with GET 
to get the followers of specific user you should set URI parameter `get=followers`, `user` to the user uid and `offset` to some offset positive number (as the endpoint returns only 10 users), if no such a user with the provided user uid, the request will fail with 404 NOT FOUND HTTP status code, and a successful request is indicated by 200 OK HTTP status code. 

### 2. Get Followings with GET 
to get the Followings of specific user you should set URI parameter `get=followings`, `user` to the user uid and `offset` to some offset positive number (as the endpoint returns only 10 users), if no such a user with the provided user uid, the request will fail with 404 NOT FOUND HTTP status code, and a successful request is indicated by 200 OK HTTP status code. 

### 3. Get Follow suggestions with GET 
to get follow suggestions of the signed in user you should set URI parameter `get=suggestions` and `offset` to some offset positive number (as the endpoint returns only 10 users), and a successful request is indicated by 200 OK HTTP status code. 
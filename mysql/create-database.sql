create database meowdb;
create table meowdb.user (
  id INT UNSIGNED AUTO_INCREMENT NOT NULL, 
  email varchar(64) UNIQUE NOT NULL, 
  username varchar(64) UNIQUE NOT NULL, 
  password varchar(300) NOT NULL, 
  # very long as it a hash
  displayName varchar(64) NOT NULL, 
  displayImageUrl varchar(255), 
  birthdate TIMESTAMP, 
  location varchar(255), 
  bio varchar(255), 
  registrationTimestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL, 
  primary key(id)
);
create table meowdb.post (
  id INT UNSIGNED AUTO_INCREMENT, 
  sharedPostId INT UNSIGNED, 
  userId INT UNSIGNED NOT NULL, 
  content varchar(350), 
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
  primary key(id), 
  foreign key(sharedPostId) references meowdb.post(id) on delete cascade, 
  foreign key(userId) references meowdb.user(id) on delete cascade
);
create table meowdb.follow (
  firstId INT UNSIGNED NOT NULL, 
  secondId INT UNSIGNED NOT NULL, 
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
  primary key(firstId, secondId), 
  foreign key(firstId) references meowdb.user(id) on delete cascade, 
  foreign key(secondId) references meowdb.user(id) on delete cascade
);
create table meowdb.comment (
  id INT UNSIGNED AUTO_INCREMENT, 
  postId INT UNSIGNED, 
  userId INT UNSIGNED NOT NULL, 
  content varchar(350), 
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
  primary key(id), 
  foreign key(postId) references meowdb.post(id) on delete cascade, 
  foreign key(userId) references meowdb.user(id) on delete cascade
);
create table meowdb.post_like (
  postId INT UNSIGNED, 
  userId INT UNSIGNED, 
  primary key(postId, userId), 
  foreign key(postId) references meowdb.post(id) on delete cascade, 
  foreign key(userId) references meowdb.user(id) on delete cascade
);
create table meowdb.comment_like (
  commentId INT UNSIGNED, 
  userId INT UNSIGNED, 
  primary key(commentId, userId), 
  foreign key(commentId) references meowdb.comment(id) on delete cascade, 
  foreign key(userId) references meowdb.user(id) on delete cascade
);
create view meowdb.user_view as (
  select 
    id, 
    email, 
    username, 
    password, 
    displayName, 
    displayImageUrl, 
    unix_timestamp(birthdate) as birthdate, 
    location, 
    bio, 
    unix_timestamp(registrationTimestamp) as registrationTimestamp, 
    (
      select 
        count(firstId) 
      from 
        meowdb.follow 
      where 
        secondId = meowdb.user.id
    ) as followersCount, 
    (
      select 
        count(firstId) 
      from 
        meowdb.follow 
      where 
        firstId = meowdb.user.id
    ) as followingsCount 
  from 
    meowdb.user
);
create view meowdb.comment_view as (
  select 
    id, 
    postId, 
    userId, 
    content, 
    unix_timestamp(timestamp) as timestamp, 
    (
      select 
        count(commentId) 
      from 
        meowdb.comment_like 
      where 
        commentId = meowdb.comment.id
    ) as likesCount 
  from 
    meowdb.comment
);
create view meowdb.post_view as (
  select 
    id, 
    sharedPostId, 
    userId, 
    content, 
    unix_timestamp(timestamp) as timestamp, 
    (
      select 
        count(postId) 
      from 
        meowdb.post_like 
      where 
        postId = _post.id
    ) as likesCount, 
    (
      select 
        count(id) 
      from 
        meowdb.comment 
      where 
        postId = _post.id
    ) as commentsCount, 
    (
      select 
        count(id) 
      from 
        meowdb.post 
      where 
        sharedPostId = _post.id
    ) as sharesCount 
  from 
    meowdb.post _post
);
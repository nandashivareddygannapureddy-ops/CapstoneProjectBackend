### Backend development

1. create git repo
    git init
2. Add .gitignore file
3. Create .env file for environment variables
4. Generate package.json
5. create express app
6. connect to database
7. Add middlewares(body parser, err handling middlewares)
8. Design schemas and create models
9. Design REST APIs for all resources


  ### Registration & Login


10. Registration & Login


//client side app

React App   -----> HTTP req       HTTP-------->1.Author API ---->DB req    Database
post man    <----- HTTP Res      server        2.User API  <-----BD res    Database
                                               3.Admin API




### Author Login
POST http://localhost:4000/common-api/login
Content-Type: application/json

{
  "email":"admin5@gmail.com",
  "password":"admin5"
}

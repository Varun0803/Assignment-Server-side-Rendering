const express = require("express");
const fs = require("fs");

const app = express();

var session = require("express-session");
const { request } = require("http");
const { err } = require("pm2/lib/Common");
app.set("view engine", "ejs")
app.use(express.static("assets"))
//-------------------middleware----------------------------
app.use((request, response, next) => {
    console.log(request.method, request.url);
    next();
})
app.use(express.urlencoded({ extended: true }))
app.use(express.json());
app.use(session({
    secret: 'This is a secure key',
    resave: true,
    saveUninitialized: true,
}))
//----------------------html--------------------------
app.get("/", function (request, response) {
    if (request.session.isLoggedin) {
        response.render("index", { username: request.session.username })
        return;
    }
    response.redirect("/login")
})
app.get("/login", function (request, response) {
    if (request.session.isLoggedin) {
        response.redirect("/")
        return
    }
    response.render("login", { error: null })
})
app.get("/signup", function (request, response) {
    if (request.session.isLoggedin) {
        response.redirect("/")
        return;
    }
    response.render("signup", { error: null })

})

app.get("/about", function (request, response) {
    if (request.session.isLoggedin) {
        response.render("about")
        return;
    }
    response.redirect("/login")
});
app.get("/contact", function (request, response) {
    if (request.session.isLoggedin) {
        response.render("contact")
        return;
    }
    response.redirect("/login")
});
app.get("/todo", function (request, response) {
    if (request.session.isLoggedin) {
        username = request.session.username
        getTodo(username,false,function(error,todos){
            if(error){
                response.status(500);
                response.json({error:error})
            }
            else{
                response.render("todo",{todos:todos});
            }
        })
        // response.render("todo")
        return;
    }
    response.redirect("/login")
});
app.get("/logout", function (request, response) {
    if (request.session.isLoggedin) {
        request.session.destroy(function (error) {
            if (error) {
                response.status(500)
                response.send("Something went wrong please try later")
            }
            else {
                response.render("logout")
            }
        })
        return;
    }
    response.redirect("/login")
});
//-----------------------css-------------------------
// app.get("/css/style-index.css",function(request,response){
//     response.sendFile(__dirname+"/css/style-index.css")
// });
// app.get("/css/style-about.css",function(request,response){
//     response.sendFile(__dirname+"/css/style-about.css")
// });
// app.get("/css/style-contact.css",function(request,response){
//     response.sendFile(__dirname+"/css/style-contact.css")
// });
// app.get("/css/style-login.css",function(request,response){
//     response.sendFile(__dirname+"/css/style-login.css")
// });
// app.get("/css/style-todo.css",function(request,response){
//     response.sendFile(__dirname+"/css/style-todo.css")
// });
// app.get("/css/style-signup.css",function(request,response){
//     response.sendFile(__dirname+"/css/style-signup.css")
// });
//---------------------js---------------------------
// app.get("/js/todo.js",function(request,response){
//     response.sendFile(__dirname+"/js/todo.js")
// });
//-----------------------------------------------

//------------------------------------------------------------------------------
app.post("/login", function (request, response) {
    const username = request.body.username;
    const password = request.body.password;
    fs.readFile("user.gif", "utf-8", function (error, data) {
        if (error) {
            response.status(500)
            response.send()
        }
        else {
            try {
                if (data.length === 0) {
                    response.render("login", { error: "Invalid username or password" })
                    return;
                }
                let users = JSON.parse(data)

                const user = users.find(function (user) {
                    return user.username === username && user.password === password
                })
                if (user) {
                    request.session.isLoggedin = true;
                    request.session.username = username;
                    response.redirect("/")
                    return;
                }
                else {
                    response.render("login", { error: "Invalid username or password" })
                }


            }
            catch (error) {
                console.log(error)

            }
        }
    })

})
//-------------------------------------------------------------------------------
app.post("/signup", function (request, response) {
    const username = request.body.username;
    const email = request.body.email;
    const password = request.body.password;
    let user = { username: username, email: email, password: password }
    fs.readFile("./user.gif", "utf-8", function (error, data) {
        if (error) {
            response.status(403)
            response.send()
        }
        else {
            if (data.length === 0) {
                data = "[]"
            }
            try {
                let arr = JSON.parse(data)
                const already_present_email = arr.find(function (name) {
                    return name.email === email;
                })
                const already_present_user = arr.find(function (name) {
                    return name.username === username;
                })

                if (already_present_email) {
                    response.render("signup", { error: "Email address is already present" })
                }
                else {
                    if (already_present_user) {
                        response.render("signup", { error: "Username is already taken" })
                    }
                    else {
                        arr.push(user)
                        fs.writeFile("user.gif", JSON.stringify(arr), function (error) {
                            if (error) {
                                console.log(error)
                            }
                            else {
                                response.redirect("/login")
                            }
                        })
                    }
                }
            }
            catch (error) {
                console.log(error)
            }
        }
    })
})


//-------------------------------------------------------------------------
app.get("/todos", function (request, response) {

    getTodo(request.session.username, false, function (error, todos) {
        if (error) {
            response.status(500)
            response.json({ error: "error" })
        }
        else {
            response.status(200)
            response.json(todos)
        }
    })
})
//-------------------------------------------------------------------------

app.post("/todo", function (request, response) {
    const todo = request.body;
    todo.createdBy = request.session.username;
    saveTodo(todo, function (error) {
        if (error) {
            response.status(500)
            response.json({ error: error })
        }
        else {
            response.status(200)
            response.send()
        }
    })
})
//--------------------------------------------------------------------------
app.delete("/todo", function (request, response) {
    const todo = request.body;
    getTodo(null, true, function (error, todos) {
        if (error) {
            response.status(500);
            response.json({ error: error });
        } else {
            const filteredTodos = todos.filter(function (todoItem) {
                if(todoItem.createdBy === request.session.username){
                    return todoItem.text !== todo.text
                }
                return todoItem;
            });

            fs.writeFile(
                "todo.jpg",
                JSON.stringify(filteredTodos),
                function (error) {
                    if (error) {
                        response.status(500);
                        response.json({ error: error });
                    } else {
                        response.status(200);
                        response.send();
                    }
                }
            );
        }
    });
});
//------------------------------------------------------------------------- 
app.put("/todo-status", function (request, response) {
    const todo = request.body;
    getTodo(null, true, function (error, todos) {
        if (error) {
            response.status(500);
            response.json({ error: error });
        }
        else {
            const newtodolist = todos.filter(function (todoItem) {
                if (todoItem.createdBy === request.session.username) {
                    if (todoItem.text === todo.text) {
                        if (todoItem.ischecked === false) {
                            todoItem.ischecked = true;
                            return todoItem;
                        }
                        else {
                            todoItem.ischecked = false;
                            return todoItem;
                        }
                    }
                }
                return todoItem;
            })
            //------------------------------------------------
            fs.writeFile("todo.jpg", JSON.stringify(newtodolist), function (error) {
                if (error) {
                    response.status(500);
                    response.json({ error: error });
                } else {
                    response.status(200);
                    response.send();
                }
            })
        }
    })
}
)

//------------------------------------------------------------------------------------------------


function saveTodo(todo, callback) {
    getTodo(null, true, function (error, todos) {
        if (error) {
            callback(error)
        }
        else {

            todos.push(todo)
            fs.writeFile("todo.jpg", JSON.stringify(todos), function (error) {
                if (error) {
                    callback(error)
                }
                else {
                    callback()
                }
            })
        }
    })
}
//-------------------------------------------------------------------------------------------------
function getTodo(userName, all, callback) {
    fs.readFile("todo.jpg", "utf-8", function (error, data) {
        if (error) {
            callback("error")
        }
        else {
            if (data.length === 0) {
                data = "[]"
            }
            try {
                let todos = JSON.parse(data);
                if (all) {
                    callback(null, todos)
                    return
                }
                const filteredTodos = todos.filter(function (todo) {
                    return todo.createdBy === userName;
                });
                callback(null, filteredTodos);
            }
            catch (error) {
                callback(null, [])
            }
        }
    })
}
app.get("*", function (request, response) {
    response.render("404")
})

app.listen(8000, function () {
    console.log("Server is running successfully on port 8000");
})
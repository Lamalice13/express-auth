const express = require("express");
const path = require("node:path");
const session = require("express-session");
const passport = require("passport");
const bcrypt = require("bcryptjs");
const pool = require("./db/pool");

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(
  // If there's no cookie sent by the browser : Create a session db table and put these informations in the req.session
  // Otherwise, it will check if the session.id of the cookie sent if it's in the session db table, and populate req.session
  session({
    store: new (require("connect-pg-simple")(session))({
      pool: pool,
      createTableIfMissing: true,
    }),
    secret: "cats",
    resave: false,
    saveUninitialized: true,
    // This would be in the set-cookie response header with the session.id signed with a secret for the browser
    cookie: { maxAge: 1000 * 60 * 60 * 24 },
  })
);

// Execute the passport file, we don't need the return of it
require("./config/passport");

// read req.session.passport.user which is the user id
// Call deserializeUser() with this id, which then do the query db, get the user from the done(user) and populate req.user
app.use(passport.session());

app.use((req, res, next) => {
  res.locals.currentUser = req.user;
  next();
});

app.get("/", (req, res) => {
  if (req.session.viewCount) {
    req.session.viewCount = req.session.viewCount + 1;
    console.log(req.session.viewCount);
  } else {
    req.session.viewCount = 1;
  }

  res.render("index");
});

app
  .route("/sign-up")
  .get((req, res) => res.render("sign-up-form"))
  .post(async (req, res, next) => {
    try {
      const hashedassword = await bcrypt.hash(req.body.password, 10);
      await pool.query(
        "INSERT INTO users (username, password) VALUES ($1, $2)",
        [req.body.username, hashedassword]
      );
      res.redirect("/");
    } catch (err) {
      return next(err);
    }
  });

app.post(
  "/log-in",
  // Call the verifyRequest callback, which is going to return either a user if the user gave the correct credentials, or false in cas of login failure.
  // If login is successfull give the user to the serialize() function, which then populate req.session.passport object with the user id
  // express-session will detect that req.session has been modified and will update the row on the session table where the session id sent by the browser is.
  passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/",
  })
);

app.get("/log-out", (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    res.redirect("/");
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, (error) => {
  if (error) return console.log(error);
  console.log(`App running on ${PORT}`);
});

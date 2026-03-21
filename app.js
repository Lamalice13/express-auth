const express = require("express");
const path = require("node:path");
const { Pool } = require("pg");
const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;

const pool = new Pool({
  connectionString: "posgresql://postgres:aqpm@localhost:5432/users_auth",
});

const app = express();
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(session({ secret: "cats", resave: false, saveUninitialized: true }));
app.use(passport.session());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => res.render("index"));
app
  .route("/sign-up")
  .get((req, res) => res.render("sign-up-form"))
  .post(async (req, res, next) => {
    try {
      await pool.query(
        "INSERT INTO users (username, password) VALUES ($1, $2)",
        [req.body.username, req.body.password]
      );
      res.redirect("/");
    } catch (err) {
      return next(err);
    }
  });

const PORT = process.env.PORT || 3000;
app.listen(PORT, (error) => {
  if (error) return console.log(error);
  console.log(`App running on ${PORT}`);
});

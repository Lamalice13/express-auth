const express = require("express");
const path = require("node:path");
const { Pool } = require("pg");
const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;

const app = express();
app.use(session({ secret: "cats", resave: false, saveUninitialized: true }));
app.use(express.urlencoded({ extended: true }));
app.use(passport.session());

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

const pool = new Pool({
  connectionString: "postgresql://postgres:aqpm@localhost:5432/users_auth",
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, (error) => {
  if (error) return console.log(error);
  console.log(`App running on ${PORT}`);
});

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

// Function one: setting up the LocalStrategy
passport.use(
  new LocalStrategy(async (username, password, done) => {
    try {
      const { rows } = await pool.query(
        "SELECT * FROM users WHERE username = $1",
        [username]
      );
      const user = rows[0];

      if (!user) {
        return done(null, false, { message: "Incorrect username !" });
      }

      if (user.password !== password) {
        return done(null, false, { message: "Incorrect password !" });
      }

      return done(null, user);
    } catch (err) {
      return done(err);
    }
  })
);

// When a session is created, express-session creates a cookie called connect.sid to the browser which is stored in it.
// Passport will receive the user object found from a successful login and store its id property in the session data (server-side). We call it "serialize".

passport.serializeUser((user, done) => {
  done(null, user.id);
});

// À chaque fois que ton navigateur fait une requête vers le serveur (cliquer un lien, charger une page, etc.), il envoie automatiquement le cookie connect.sid avec.
// express-session will find a matching session (if it exists). If it does, passport will deserialize the id we serialize into the session data, and make querie with this id. Then, it will add the informations to the req.user, which we can retrieve later.
passport.deserializeUser(async (id, done) => {
  try {
    const { rows } = await pool.query("SELECT * FROM users WHERE id = $1", [
      id,
    ]);
    const user = rows[0];
    done(null, user);
  } catch (err) {
    done(err);
  }
});

app.use((req, res, next) => {
  res.locals.currentUser = req.user;
  next();
});
app.get("/", (req, res) => res.render("index"));

app.post(
  "/log-in",
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

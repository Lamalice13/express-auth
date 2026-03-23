const passport = require("passport");
const pool = require("../db/pool");
const LocalStrategy = require("passport-local").Strategy;
const bcrypt = require("bcryptjs");

const verifyCallback = async (username, password, done) => {
  // user verification logic
  // We do as we want, we just have to give to the done() callback what passport expects

  try {
    // We look up if there's a user in the db
    const { rows } = await pool.query(
      "SELECT * FROM users WHERE username = $1",
      [username]
    );
    const user = rows[0];

    if (!user) {
      // If there's no user, it will return a 401 on unauthroized HTTP status
      return done(null, false, { message: "Incorrect username !" });
    }
    // If there's a user, we check if the passwords match
    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      // If there's no match, it will return a 401 on unauthroized HTTP status
      return done(null, false, { message: "Incorrect password !" });
    }

    // If it's the log in is successfull, we're returning the user
    return done(null, user);
  } catch (err) {
    // If there's an error during the db process, we're giving that to passport and he knows how to handle that
    return done(err);
  }
};

// The strategy is only there to verify the user exists in the db and the user credentials match.
const strategy = new LocalStrategy(verifyCallback);

// Passport will retrieve by default the form data value with the keys "username" and "password", in the req.body. And passes it to the verifyCallback
passport.use(strategy);

// Put the user id into the session store in the passport obj
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Grab the user id from the session and find the user with that id
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

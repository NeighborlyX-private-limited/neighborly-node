const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth2').Strategy;

passport.serializeUser((user, done) => {
    done(null, user);
})
passport.deserializeUser(function (user, done) {
    done(null, user);
});

passport.use(new GoogleStrategy({
    clientID: "348303822261-v2l0kihvgebpjvu5kmd7fl108ndig2b0.apps.googleusercontent.com", // Your Credentials here. 
    clientSecret: "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", // Your Credentials here. 
    callbackURL: "http://localhost:5000/user/google/callback",
    passReqToCallback: true
},
    function (request, accessToken, refreshToken, profile, done) {
        return done(null, profile);
    }
));

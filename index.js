const { google } = require('googleapis');
const express = require('express')
const OAuth2Data = require('./credentials.json')

const app = express()

const CLIENT_ID = OAuth2Data.client_id
const CLIENT_SECRET = OAuth2Data.client_secret
const REDIRECT_URL = OAuth2Data.redirect_uris

const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URL)
var authed = false;

app.get('/', (req, res) => {
    if (!authed) {
        // Generate an OAuth URL and redirect there
        const url = oAuth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: 'https://www.googleapis.com/auth/gmail.readonly'
        });
        console.log(url)
        res.redirect(url);
    } else {
        const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
        gmail.users.labels.list({
            userId: 'me',
        }, (err, res) => {
            if (err) return console.log('The API returned an error: ' + err);
            const labels = res.data.labels;
            if (labels.length) {
                console.log('Labels:');
                labels.forEach((label) => {
                    console.log(`- ${label.name}`);
                });
            } else {
                console.log('No labels found.');
            }
        });
        res.send('Logged in')
    }
})

app.get('/auth/google/callback', function (req, res) {
    const code = req.query.code
    if (code) {
        // Get an access token based on our OAuth code
        oAuth2Client.getToken(code, function (err, tokens) {
            if (err) {
                console.log('Error authenticating')
                console.log(err);
            } else {
                console.log('Successfully authenticated');
                oAuth2Client.setCredentials(tokens);
                authed = true;
                res.redirect('/')
            }
        });
    }
});

const VKontakteStrategy = require('passport-vkontakte').Strategy;

// User session support middlewares.
app.use(require('body-parser').urlencoded({extended: true}));
app.use(passport.initialize());
app.use(passport.session());

passport.use(new VKontakteStrategy(
  {
    clientID:     VKONTAKTE_APP_ID, // VK.com docs call it 'API ID', 'app_id', 'api_id', 'client_id' or 'apiId'
    clientSecret: VKONTAKTE_APP_SECRET,
    callbackURL:  "http://localhost:5000/auth/vkontakte/callback"
  },
  function myVerifyCallbackFn(accessToken, refreshToken, params, profile, done) {

    User.findOrCreate({ vkontakteId: profile.id })
        .then(function (user) { done(null, user); })
        .catch(done);
  }
));

passport.serializeUser(function(user, done) {
    done(null, user.id);
});

passport.deserializeUser(function(id, done) {
    User.findById(id)
        .then(function (user) { done(null, user); })
        .catch(done);
});
app.get('/auth/vkontakte', passport.authenticate('vkontakte'));

app.get('/auth/vkontakte/callback',
  passport.authenticate('vkontakte', {
    successRedirect: '/',
    failureRedirect: '/login' 
  })
);

app.get('/', function(req, res) {
    res.json(req.user);
});
const port = process.env.port || 5000
app.listen(port, () => console.log(`Server running at ${port}`));
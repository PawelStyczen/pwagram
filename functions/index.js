const functions = require("firebase-functions");
const admin = require("firebase-admin");
var cors = require("cors")({ origin: true });
const webpush = require('web-push');

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions


//* Initialize the Admin thingy
//? the full code and the key for initializing can be found in firebase project settings 

var serviceAccount = require("./pwa-key.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://pwgram-ae7bc-default-rtdb.firebaseio.com/'
});


exports.storePostData = functions.https.onRequest((request, response) => {
  cors(request, response, function() {
    admin
      .database()
      .ref("posts")
      .push({
        id: request.body.id,
        title: request.body.title,
        location: request.body.location,
      })
      .then(function () {
        response
          webpush.setVapidDetails('mailto:design@pawelstyczen.com', 'BMrS_SD8kBPZtct8W1_uRTgUFkF_JdwrLPojkEB1jyESqYtn6GQp0MGwxJ-WIFZKG0iYQ1Mzl2e4Pi8CUz-IzcM', 'dIGWRDo2liEwXmILSISwsa-n2hHH5AKIuKs9gYic_qQ');
          return admin.database().ref('subscriptions').once('value');
         
      })
      .then(function(subscriptions) {
        //? looping all subscriptions
        //? adding the config for each sub
        subscriptions.forEach((sub) => {
          const pushConfig = {
            endpoint: sub.val().endpoint,
            keys: {
              auth: sub.val().keys.auth,
              p256dh: sub.val().keys.p256dh
            }
            
          };

          webpush.sendNotification(pushConfig, JSON.stringify({title: 'New Post', content: 'New Post Added!'}))
          .catch((err) => {
            console.log(err)
          })
        });
        response.status(201).json({message: 'Data stored', id: request.body.id});
      })
      .catch(function (err) {
        response.status(500).json({ error: err }); //! error handling 
      });
  });
});

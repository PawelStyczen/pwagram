const functions = require("firebase-functions");
const admin = require("firebase-admin");
var cors = require("cors")({ origin: true });

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
          .status(201)
          .json({ message: "data stored", id: request.body.id });
      })
      .catch(function (err) {
        response.status(500).json({ error: err }); //! error handling 
      });
  });
});

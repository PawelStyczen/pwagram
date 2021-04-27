const functions = require("firebase-functions");
const admin = require("firebase-admin");
var cors = require("cors")({ origin: true });
const webpush = require("web-push");
var formidable = require("formidable");
var fs = require("fs");
var UUID = require("uuid-v4");

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions

//* Initialize the Admin thingy
//? the full code and the key for initializing can be found in firebase project settings

var serviceAccount = require("./pwa-key.json");
var gcconfig = {
  projectId: "pwgram-ae7bc",
  keyFilename: "pwa-key.json",
};
var gcs = require("@google-cloud/storage")(gcconfig);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://pwgram-ae7bc-default-rtdb.firebaseio.com/",
});

//* STORING FILES ON FIREBASE

exports.storePostData = functions.https.onRequest((request, response) => {
  cors(request, response, function () {
    var uuid = UUID(); //?generate a unique id
    var formData = new formidable.IncomingForm();
    formData.parse(request, (err, fields, files) => {
      fs.rename(files.file.path, "/tmp/" + files.file.name);

      var bucket = gcs.bucket("pwgram-ae7bc.appspot.com"); //? firebase storage

      bucket.upload(
        "/tmp/" + files.filename,
        {
          uploadType: "media",
          metadata: {
            metadata: {
              contentType: files.file.type,
              firebaseStorageDownloadTokens: uuid, //?generating a unique download link
            },
          },
        },
        function (err, file) {
          if (!err) {
            admin
              .database()
              .ref("posts")
              .push({
                id: fields.id,
                title: fields.title,
                location: fields.location,
                image: 'https://firebasestorage.googleapis.com/v0/b/' + bucket.name + '/o/' + encodeURIComponent(file.name) + '?alt=media&token=' + uuid //? store file link on firebase
              })
              .then(function () {
                response;
                webpush.setVapidDetails(
                  "mailto:design@pawelstyczen.com",
                  "BN4R2oi1sLk5qgUhpf0jMqxUAUKgK7ZTSIOPaRRScVv9k4fGScgpIcmfHpw8AMHOVvCCuuoDDfm4honRXjMZFk4",
                  "ABku1eDRkZTRXtz2QZb7Qt3OVqGDqJMcScbl7EmWL0E"
                );
                return admin.database().ref("subscriptions").once("value");
              })
              .then(function (subscriptions) {
                //? looping all subscriptions
                //? adding the config for each sub
                subscriptions.forEach(function (sub) {
                  var pushConfig = {
                    endpoint: sub.val().endpoint,
                    //? adding vapid authentication to each subscription
                    keys: {
                      auth: sub.val().keys.auth,
                      p256dh: sub.val().keys.p256dh,
                    },
                  };
                  //* SENDING THE NOTIFICATION
                  webpush
                    .sendNotification(
                      pushConfig,
                      JSON.stringify({
                        title: "New Post",
                        content: "New Post Added!",
                        openUrl: "/help",
                      })
                    )
                    .catch((err) => {
                      console.log(err);
                    });
                });
                response
                  .status(201)
                  .json({ message: "Data stored", id: fields.id });
              })
              .catch(function (err) {
                response.status(500).json({ error: err }); //! error handling
              });
          } else {
            console.log(err);
          }
        }
      );
    });
  });
});

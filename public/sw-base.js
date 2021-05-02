importScripts("workbox-sw.prod.v2.1.3.js");
importScripts("/src/js/idb.js");
importScripts("/src/js/utility.js");

const workboxSW = new self.WorkboxSW();

//* additional cache of all  google resources (fonts)
workboxSW.router.registerRoute(
  /.*(?:googleapis|gstatic)\.com.*$/,
  workboxSW.strategies.staleWhileRevalidate({
    cacheName: "google-fonts",
    cacheExpiration: {
      maxEntries: 3,
      maxAgeSeconds: 60 * 60 * 24 * 30,
    },
  })
);

workboxSW.router.registerRoute(
  "https://cdnjs.cloudflare.com/ajax/libs/material-design-lite/1.3.0/material.indigo-pink.min.css",
  workboxSW.strategies.staleWhileRevalidate({
    cacheName: "material-css",
  })
);

workboxSW.router.registerRoute(
  /.*(?:firebasestorage\.googleapis)\.com.*$/,
  workboxSW.strategies.staleWhileRevalidate({
    cacheName: "post-images",
  })
);

workboxSW.router.registerRoute(
  "https://pwgram-ae7bc-default-rtdb.firebaseio.com/posts.json",
  function (args) {
    return fetch(args.event.request).then((res) => {
      var clonedRes = res.clone();
      clearAllData("posts")
        .then(() => {
          return clonedRes.json();
        })
        .then((data) => {
          for (var key in data) {
            writeData("posts", data[key]);
          }
        });

      return res;
    });
  }
);



workboxSW.router.registerRoute(
  function (routeData) {
    return routeData.event.request.headers.get("accept").includes("text/html");
  },
  function (args) {
    return caches.match(args.event.request).then(function (response) {
      if (response) {
        return response;
      } else {
        return fetch(args.event.request)
          .then((res) => {
            return caches.open("dynamic").then((cache) => {
              // trimCache(CACHE_DYNAMIC_NAME, 3);
              cache.put(args.event.request.url, res.clone());
              return res;
            });
          })
          .catch((err) => {
            return caches.match("/offline.html").then((res) => {
              //additional conditional cache routing
              return res;
            });
          });
      }
    });
  }
);

workboxSW.precache([]);


//* background Sync
self.addEventListener("sync", (event) => {
  console.log("[SW] background syncing", event);
  if (event.tag === "sync-new-posts") {
    console.log("[SW] syncing new posts");
    event.waitUntil(
      readAllData("sync-posts").then((data) => {
        for (var dt of data) {
          var postData = new FormData();
          postData.append('id', dt.id);
          postData.append('title', dt.title);
          postData.append('location', dt.location);
          postData.append('rawLocationLat', dt.rawLocation.lat);
          postData.append('rawLocationLng', dt.rawLocation.lng);
          postData.append('file', dt.picture, dt.id + '.png');

          fetch(
            "https://us-central1-pwgram-ae7bc.cloudfunctions.net/storePostData",
            {
              method: "POST",
              body: postData
            }
          )
            .then(function(res){
              console.log("Sent data", res);
              if (res.ok) {
                res.json().then(function (resData) {
                  deleteItemFromData("sync-posts", resData.id);
                });
              }
            })
            .catch(function(err) {
              console.log("ERROr while sending data", err);
            });
        }
      })
    );
  }
});

//*Notification click
self.addEventListener("notificationclick", function(event){
  const notification = event.notification;
  const action = event.action;

  console.log(notification);

  if (action === "confirm") {
    console.log("confirm was chosen");
    notification.close();
  } else {
    console.log(action);
    event.waitUntil(
      clients.matchAll().then(function (clis) {
        //? check if browser is open
        var client = clis.find(function (c) {
          return c.visibilityState === "visible";
        });

        if (client !== undefined) {
          client.navigate(notification.data.url);
          client.focus();
        } else {
          clients.openWindow(notification.data.url);
        }
        notification.close();
      })
    );
    
  }
});

self.addEventListener("notificationclose", (event) => {
  console.log("Notification was closed", event);
});

//* LISTEN TO PUSH MSG

self.addEventListener("push", (event) => {
  console.log("push notification received", event);

  //? fallback in case we dont get the data in the push
  var data = { title: "New!", content: " Something new happend!", openUrl: '/' };

  if (event.data) {
    data = JSON.parse(event.data.text());
  }

  //*show notification
  var options = {
    body: data.content,
    icon: "/src/images/icons/app-icon-96x96.png",
    badge: "/src/images/icons/app-icon-96x96.png",
    data: {
      url: data.openUrl
    }
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

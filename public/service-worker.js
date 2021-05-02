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

workboxSW.precache([
  {
    "url": "404.html",
    "revision": "0a27a4163254fc8fce870c8cc3a3f94f"
  },
  {
    "url": "favicon.ico",
    "revision": "2cab47d9e04d664d93c8d91aec59e812"
  },
  {
    "url": "index.html",
    "revision": "fd48136656e4e3192e3a1e6214e6a965"
  },
  {
    "url": "manifest.json",
    "revision": "0049e50d51b79e1333d577931013ccf5"
  },
  {
    "url": "offline.html",
    "revision": "4a8def2516865c059c5e89b91bfbc296"
  },
  {
    "url": "service-worker.js",
    "revision": "18af469766468899b122004c655131fc"
  },
  {
    "url": "src/css/app.css",
    "revision": "f27b4d5a6a99f7b6ed6d06f6583b73fa"
  },
  {
    "url": "src/css/feed.css",
    "revision": "edb6851fd7f76aec67d4ca36a09b166d"
  },
  {
    "url": "src/css/help.css",
    "revision": "1c6d81b27c9d423bece9869b07a7bd73"
  },
  {
    "url": "src/js/app.js",
    "revision": "3f2b764c0cd46f27410aaf1bfb8043f5"
  },
  {
    "url": "src/js/feed.js",
    "revision": "24aa740f2782394777f874f34408c41b"
  },
  {
    "url": "src/js/fetch.js",
    "revision": "6b82fbb55ae19be4935964ae8c338e92"
  },
  {
    "url": "src/js/idb.js",
    "revision": "017ced36d82bea1e08b08393361e354d"
  },
  {
    "url": "src/js/material.min.js",
    "revision": "713af0c6ce93dbbce2f00bf0a98d0541"
  },
  {
    "url": "src/js/promise.js",
    "revision": "10c2238dcd105eb23f703ee53067417f"
  },
  {
    "url": "src/js/utility.js",
    "revision": "2778cd90d11750a8fa0b33a12ba0210e"
  },
  {
    "url": "sw-base.js",
    "revision": "3d0ad3944206faf42ae7ad4837e87355"
  },
  {
    "url": "sw.js",
    "revision": "f21cb8be685e0abb8021700a3696da5c"
  },
  {
    "url": "workbox-sw.prod.v2.1.3.js",
    "revision": "a9890beda9e5f17e4c68f42324217941"
  },
  {
    "url": "src/images/main-image-lg.jpg",
    "revision": "31b19bffae4ea13ca0f2178ddb639403"
  },
  {
    "url": "src/images/main-image-sm.jpg",
    "revision": "c6bb733c2f39c60e3c139f814d2d14bb"
  },
  {
    "url": "src/images/main-image.jpg",
    "revision": "5c66d091b0dc200e8e89e56c589821fb"
  },
  {
    "url": "src/images/sf-boat.jpg",
    "revision": "0f282d64b0fb306daf12050e812d6a19"
  }
]);


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

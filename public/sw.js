importScripts("/src/js/idb.js");
importScripts("/src/js/utility.js");

var CACHE_STATIC_NAME = "static-v31";
var CACHE_DYNAMIC_NAME = "dynamic-v4";
var STATIC_FILES = [
  "/",
  "/index.html",
  "/offline.html",
  "/src/js/app.js",
  "/src/js/feed.js",
  "/src/js/idb.js",
  "/src/js/promise.js",
  "/src/js/fetch.js",
  "/src/js/material.min.js",
  "/src/css/app.css",
  "/src/css/feed.css",
  "/src/images/main-image.jpg",
  "https://fonts.googleapis.com/css?family=Roboto:400,700",
  "https://fonts.googleapis.com/icon?family=Material+Icons",
  "https://cdnjs.cloudflare.com/ajax/libs/material-design-lite/1.3.0/material.indigo-pink.min.css",
];

var dbPromise = idb.open("posts-store", 1, (db) => {
  if (!db.objectStoreNames.contains("posts")) {
    db.createObjectStore("posts", { keyPath: "id" });
  }
});

/* function trimCache(cacheName, maxItems) {
  caches.open(cacheName).then((cache) => {
    return cache.keys().then((keys) => {
      if (keys.length > maxItems) {
        cache.delete(keys[0]).then(trimCache(cacheName, maxItems));
      }
    });
  });
} */
self.addEventListener("install", function (event) {
  console.log("[Service Worker] Installing Service Worker ...", event);
  event.waitUntil(
    caches.open(CACHE_STATIC_NAME).then(function (cache) {
      console.log("[Service worker] precaching app shell");
      cache.addAll(STATIC_FILES);
    })
  );
});

self.addEventListener("activate", function (event) {
  console.log("[Service Worker] Activating Service Worker ....", event);
  event.waitUntil(
    caches
      .keys() //retrieves the array of all caches (static, staticV2, dynamic)
      .then((keyList) => {
        return Promise.all(
          keyList.map((key) => {
            if (key !== CACHE_STATIC_NAME && key !== CACHE_DYNAMIC_NAME) {
              console.log("[Service worker] removing old cache", key);
              return caches.delete(key);
            }
          })
        ); //waits untill all promises are done, all cleanup caches
      })
  );
  return self.clients.claim();
});

isInArray = (string, array) => {
  for (var i = 0; i < array.length; i++) {
    if (array[i] === string) {
      return true;
    }
  }
  return false;
};

self.addEventListener("fetch", function (event) {
  var url = "https://pwgram-ae7bc-default-rtdb.firebaseio.com/posts";

  //if specific url found then put in indexeddb
  if (event.request.url.indexOf(url) > -1) {
    event.respondWith(
      fetch(event.request).then((res) => {
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
      })
    );
  } else if (isInArray(event.request.string, STATIC_FILES)) {
    self.addEventListener("fetch", function (event) {
      event.respondWith(caches.match(event.request));
    });
  } else {
    //if it is not the specific url then Normal NETWORK THEN CACHE
    event.respondWith(
      caches.match(event.request).then(function (response) {
        if (response) {
          return response;
        } else {
          return fetch(event.request)
            .then((res) => {
              return caches.open(CACHE_DYNAMIC_NAME).then((cache) => {
                // trimCache(CACHE_DYNAMIC_NAME, 3);
                cache.put(event.request.url, res.clone());
                return res;
              });
            })
            .catch((err) => {
              return caches.open(CACHE_STATIC_NAME).then((cache) => {
                //additional conditional cache routing
                if (event.request.headers.get("accept").includes("text/html")) {
                  return cache.match("/offline.html");
                }
                return cache.match("/offline.html");
              });
            });
        }
      })
    );
  }
});

/* self.addEventListener("fetch", function (event) {
  event.respondWith(
    caches.match(event.request).then(function (response) {
      if (response) {
        return response;
      } else {
        return fetch(event.request)
        .then((res)=>{
         return caches.open(CACHE_DYNAMIC_NAME)
          .then((cache) => {
            cache.put(event.request.url, res.clone());
            return res;
          })
        })
        .catch((err) => {
            return caches.open(CACHE_STATIC_NAME)
            .then((cache)=> {
              return cache.match('/offline.html')
            })
        })
      }
    })
  );
}); */

//Cache only
/* self.addEventListener("fetch", function (event) {
  event.respondWith(
    caches.match(event.request)
     );
}); */

// # strategy network and cache fallback
/* self.addEventListener("fetch", function (event) {
  event.respondWith(
    fetch(event.request).catch((err) => {
      return caches.match(event.request);
    })
  );
}); */

self.addEventListener("sync", (event) => {
  console.log("[SW] background syncing", event);
  if (event.tag === "sync-new-posts") {
    console.log("[SW] syncing new posts");
    event.waitUntil(
      readAllData("sync-posts").then((data) => {
        for (var dt of data) {
          fetch(
            "https://us-central1-pwgram-ae7bc.cloudfunctions.net/storePostData",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
              },
              body: JSON.stringify({
                id: dt.id,
                title: dt.title,
                location: dt.location,
              }),
            }
          )
            .then((res) => {
              console.log("Sent data", res);
              if (res.ok) {
                res.json().then(function (resData) {
                  deleteItemFromData("sync-posts", resData.id);
                });
              }
            })
            .catch((err) => {
              console.log("ERROr while sending data", err);
            });
        }
      })
    );
  }
});

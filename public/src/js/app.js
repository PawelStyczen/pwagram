var deferredPrompt;
var enableNotificationsButtons = document.querySelectorAll(
  ".enable-notifications"
);

if (!window.Promise) {
  window.Promise = Promise;
}

if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("/sw.js")
    .then(function () {
      console.log("Service worker registered!");
    })
    .catch(function (err) {
      console.log(err);
    });
}

window.addEventListener("beforeinstallprompt", function (event) {
  console.log("beforeinstallprompt fired");
  event.preventDefault();
  deferredPrompt = event;
  return false;
});

function displayConfirmNotification() {
  if ("serviceWorker" in navigator) {
    var options = {
      body: "You Sucessfully subbed to our service",
      icon: "/src/images/icons/app-icon-96x96.png",
      image: "/src/images/sf-boat.jpg",
      lang: "en-US", //? BCP 47
      vibrate: [100, 50, 200],
      badge: "/src/images/icons/app-icons-96x96.png", //? only android
      tag: "confirm-notification", //? stacking notifications
      renotify: true,
      actions: [
        {
          action: "confirm",
          title: "OK",
          icon: "/src/images/icons/app-icons-96x96.png",
        },
        {
          action: "cancel",
          title: "CANCEL",
          icon: "/src/images/icons/app-icons-96x96.png",
        },
      ],
    };

    //? Service worker registration allows for listening to sw events
    navigator.serviceWorker.ready.then((swreg) => {
      swreg.showNotification("Succesfully subscribed! (FROM Sw)", options);
    });
  }
}

function configurePushSub() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  var reg;
  navigator.serviceWorker.ready
    .then(function (swreg) {
      //? check if this sw has a sub for this device
      reg = swreg;
      return swreg.pushManager.getSubscription();
    })
    .then(function (sub) {
      if (sub === null) {
        //TODO create a new sub
        var vapidPublicKey = "BJst-HoWUMiAaRh6zR8WuqFcJ1X2eRb8n9-HWkdXJ6028DLiz_TQ9zIe8OTOhgT5ODgPcZKaN954qfcnQdhlPFg";
        var convertVapidPublicKey = urlBase64ToUint8Array(vapidPublicKey);
        return reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertVapidPublicKey,
        });
      } else {
        //WE have a sub
      }
    })
    .then(function (newSub) {
      return fetch(
        "https://pwgram-ae7bc-default-rtdb.firebaseio.com/subscriptions.json",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
          },
          body: JSON.stringify(newSub),
        }
      );
    })
    .then(function (res) {
      if (res.ok) {
        displayConfirmNotification();
      }
    })
    .catch((err) => {
      console.log(err);
    })
}

function askForNotificationPermission() {
  Notification.requestPermission((result) => {
    if (result !== "granted") {
      console.log("No notification permission granted!");
    } else {
      configurePushSub();
      //displayConfirmNotification();

      //TODO Hide button
    }
  });
}

if ("Notification" in window && "serviceWorker" in navigator) {
  enableNotificationsButtons.forEach((button) => {
    button.style.display = "inline-block";
    button.addEventListener("click", askForNotificationPermission);
  });
}

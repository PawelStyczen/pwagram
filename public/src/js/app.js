
var deferredPrompt;
var enableNotificationsButtons = document.querySelectorAll('.enable-notifications');

if (!window.Promise) {
  window.Promise = Promise;
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('/sw.js')
    .then(function () {
      console.log('Service worker registered!');
    })
    .catch(function(err) {
      console.log(err);
    });
}

window.addEventListener('beforeinstallprompt', function(event) {
  console.log('beforeinstallprompt fired');
  event.preventDefault();
  deferredPrompt = event;
  return false;
});

function askForNotificationPermission() {
  Notification.requestPermission((result)=>{
    if(result !== 'granted') {
      console.log('No notification permission granted!');
    }else {
      
      displayConfirmNotification()

      //TODO Hide button
    }
  })
}

function displayConfirmNotification() {
  if('serviceWorker' in navigator) {

    var options  = {
      body: 'You Sucessfully subbed to our service',
      icon: '/src/images/icons/app-icon-96x96.png',
      image: '/src/images/sf-boat.jpg',
      lang: 'en-US', //? BCP 47
      vibrate: [100, 50, 200],
      badge: '/src/images/icons/app-icons-96x96.png', //? only android
      tag: 'confirm-notification', //? stacking notifications
      renotify: true
    };

    //? Service worker registration allows for listening to sw events
    navigator.serviceWorker.ready
    .then((swreg) =>{
      swreg.showNotification('Succesfully subscribed! (FROM Sw)',options);
    })
  }
  
}

if ('Notification' in window){
  enableNotificationsButtons.forEach((button) => {
    button.style.display = 'inline-block';
    button.addEventListener('click', askForNotificationPermission);
  })
}

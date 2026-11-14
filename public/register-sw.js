if ("serviceWorker" in navigator) {
  window.addEventListener("load", function () {
    // Not straight away: on a first visit the worker's install downloads every screen and picture for
    // offline use (several MB), and right after load that competed with the map for the connection.
    // A few seconds later the map is up and the download happens behind it. Returning visitors already
    // have the worker; this only delays its update check by the same few seconds.
    setTimeout(function () {
      // updateViaCache:'none' — never let the HTTP cache mask a new sw.js;
      // the browser re-checks it on every navigation so deploys roll out fast.
      navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" });
    }, 8000);
  });
}

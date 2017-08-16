var firebaseAdmin = require("firebase-admin");
var serviceAccount = require("./../scratch1-889bb-firebase-adminsdk-rklgl-cedce508cb.json");

firebaseAdmin.initializeApp({
    credential: firebaseAdmin.credential.cert(serviceAccount),
    databaseURL: "https://scratch1-889bb.firebaseio.com"
});

var db = firebaseAdmin.database();
var rootRef = db.ref("/");
var lastAccessRef = db.ref("/last_access");

lastAccessRef.once("value", function (snapshot) {
    console.log('last_access was: ', snapshot.val());
    rootRef.update({
        last_access: new Date()
    });
});

var knownUsersRef = db.ref('/user');

module.exports = {
    knownUsersRef: knownUsersRef
}
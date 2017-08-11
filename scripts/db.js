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

function encodeAsFirebaseKey(string) {
    return string.replace(/\%/g, '%25')
        .replace(/\./g, '%2E')
        .replace(/\#/g, '%23')
        .replace(/\$/g, '%24')
        .replace(/\//g, '%2F')
        .replace(/\[/g, '%5B')
        .replace(/\]/g, '%5D');
};


module.exports = {
    knownUsersRef: knownUsersRef,
    encodeAsFirebaseKey: encodeAsFirebaseKey
}
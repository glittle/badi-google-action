'use strict';

let verseHelper = require('./verseHelper');

// var bst = require('bespoken-tools');
// var bstKey = require('./bst.json').key;
// var logless = bst.Logless.middleware(bstKey);

const App = require('actions-on-google').ApiAiApp;
var admin = require("firebase-admin");
var serviceAccount = require("./scratch1-889bb-firebase-adminsdk-rklgl-cedce508cb.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://scratch1-889bb.firebaseio.com"
});

let express = require('express');
let bodyParser = require('body-parser');

var lastRequest = {};

let expressApp = express();
expressApp.set('port', (process.env.PORT || 8001));
expressApp.use(bodyParser.json({
  type: 'application/json'
}));

expressApp.get('/*', function (request, response) {
  console.log('incoming GET - should be testing only!');
  var x = verseHelper.forNow(new Date()).verse;
  response.send('hello; ' + x);
});

// expressApp.use(logless.requestHandler);


// get current info from DB for server to use
var db = admin.database();
var rootRef = db.ref("/");
var lastAccessRef = db.ref("/last_access");

lastAccessRef.once("value", function (snapshot) {
  console.log('db last_access: ', snapshot.val());
  rootRef.update({
    last_access: new Date()
  });
});

var knownUsers = {};
var knownUsersRef = db.ref('/user');
knownUsersRef.once('value', function (snapshot) {
  knownUsers = snapshot.val() || {};
  console.log('updated from db', knownUsers)
});



function getUserId(app, request) {
  var id = '';
  if (app.isInSandbox()) {
    id = 'sandbox';
  }
  else {
    id = ((app.getUser() || {}).userId || request.body.sessionId);
    if (id.substr(0, 3) === '150') {
      id = 'sandbox'
    }
  }
  return id;
}



// main incoming call

expressApp.post('/', function (request, response) {
  var now = new Date();

  console.log('\r\n\r\n---------------------------');
  console.log('------ incoming POST ------');
  console.log('intent: ', request.body.result.metadata.intentName)
  const app = new App({
    request: request,
    response: response
  });
  console.log(JSON.stringify(request.body));

  // determine who this is
  var userId = getUserId(app, request);
  console.log('userId', userId, app.isInSandbox() ? '- in sandbox' : '- not in sandbox')

  var userRef = db.ref('/user/' + encodeAsFirebaseKey(userId));
  var userInfo = knownUsers[userId];
  console.log('initial user', userInfo);

  if (!userInfo || !userInfo.coord) {
    console.log('asking for location')
    app.askForPermission('Where are you?', app.SupportedPermissions.DEVICE_PRECISE_LOCATION);
    return;
  }

  userInfo.last_access = now;
  userRef.update({ last_access: now })

  // console.log(app.getUser())

  // try {
  //   console.log(4)
  //   app.askForPermission('To address you by name', [app.SupportedPermissions.NAME]);
  //   console.log(5);
  // } catch (error) {
  //   console.log(3, error)
  // }

  function tellAnswer() {
    let category = app.getArgument('s1-category');

    // console.log('body', request.body)
    // console.log('data', request.body.originalRequest ? request.body.originalRequest.data : '-')

    var sessionId = request.body.sessionId;
    console.log('session', sessionId);

    // console.log('getDateTime', app.getDateTime())
    // console.log('isInSandbox', app.isInSandbox())
    // console.log('getSurfaceCapabilities', app.getSurfaceCapabilities())
    // console.log('getInputType', app.getInputType())
    // console.log('getDeliveryAddress', app.getDeliveryAddress())
    // console.log('result.contacts', app.getDeliveryAddress())

    tell(category);
  }

  function tellAgain() {
    var repeatNum = +app.getArgument('repeatNum') || 1
    console.log('last', repeatNum, lastRequest);
    tell(lastRequest[userId].category, true, repeatNum)
  }

  function tell(category, again, repeatNum) {
    var last = lastRequest[userId];
    if (!last) {
      last = lastRequest[userId] = { times: 1 };
    }
    last.category = category;
    last.times++;

    var user = knownUsers[userId];
    var name = user ? user.coord.latitude : '';

    console.log('session', userId, last);
    var speak = ['<speak>'];
    if (name) {
      speak.push(name)
      speak.push(',')
    }
    if (category === 'date' || category === 'both') {
      speak.push('The date is...');
    }
    if (category === 'both') {
      speak.push('<break time="3s"/>');
    }
    if (category === 'verse' || category === 'both') {
      // app1.ask('The verse is...');
      var info = verseHelper.forNow(new Date());
      if (again) {
        repeatNum = repeatNum || 1;
        for (var r = 0; r < repeatNum; r++) {
          if (r > 0) {
            speak.push('<break time="5s"/>');
          }
          if (r > 0 || repeatNum > 1) {
            speak.push(`\n<say-as interpret-as="ordinal">${r + 1}</say-as>`)
            speak.push('\n<break time="1s"/>');
          }
          speak.push(info.verse);
        }
      } else {
        speak.push(info.isEve
          ? "The verse for this evening is: "
          : "The verse for this morning is: ");
        speak.push('\n\n<break time="1s"/>');
        speak.push(info.verse);

        speak.push('\n\n\n<break time="20s"/>');
        speak.push('I can repeat that a number of times if you wish. Just let me know how many times!');
      }
    }
    if (speak.length === 1) {
      speak.push('Sorry. Did you want today\'s Verse or Date?');
    }
    speak.push('</speak>')
    app.ask(speak.join(' '));
  }









  // function mainIntent() {
  //   console.log('mainIntent');
  //   let inputPrompt = app.buildInputPrompt(true, '<speak>Hi! <break time="1"/> ' +
  //     'I can read out an ordinal like ' +
  //     '<say-as interpret-as="ordinal">123</say-as>. Say a number.</speak>', ['I didn\'t hear a number', 'If you\'re still there, what\'s the number?', 'What is the number?']);

  //   // let permission = assistant.SupportedPermissions.NAME;
  //   // assistant.askForPermission('To address you by name', permission);

  //   app.ask(inputPrompt);
  //   app.tell();
  // }

  // function rawInput() {
  //   console.log('rawInput');
  //   console.log(app.getDeviceLocation())
  //   if (app.getRawInput() === 'bye') {
  //     app.tell('Goodbye!');
  //   } else {
  //     var x = verseHelper.forNow(new Date()).verse;
  //     app.ask(x);
  //   }
  // }

  // function requestPermission() {
  //   let permission = [
  //     // assistant.SupportedPermissions.DEVICE_PRECISE_LOCATION
  //   ];
  //   // assistant.askForPermissions('To pick you up', permissions);
  // }

  let actionMap = new Map();
  actionMap.set('tell.answer', tellAnswer);
  actionMap.set('tell.again', tellAgain);

  // console.log(1)
  // if (app.isPermissionGranted()) {
  //   console.log(2)
  //   let displayName = app.getUserName().displayName;
  //   let deviceCoordinates = app.getDeviceLocation().coordinates;
  //   console.log(displayName);
  //   console.log(deviceCoordinates);
  // }
  // actionMap.set('request_permission', requestPermission);

  const REQUEST_PERMISSION_ACTION = 'request_permission';
  const SAY_NAME_ACTION = 'get_name';

  function receiveLocation(app) {
    if (app.isPermissionGranted()) {
      /*
          "coordinates": {
            "latitude": 51.1004367,
            "longitude": -113.95960439999999
          }
      */
      var coord = app.getDeviceLocation().coordinates;

      userRef.update({ coord: coord });
      userInfo.coord = coord;

      app.ask('Thanks!');
    } else {
      app.tell('Sorry, I need to know about where you are.');
    }

    // console.log('requesting permission!')
    // app.askForPermission('To know who you are', app.SupportedPermissions.NAME);
  }

  function spacedOut(s) {
    return s.split('').join(' ');
  }
  function whoAmI(app) {
    //    <say-as interpret-as="characters">${spacedOut(userId)}</say-as>
    var msg = `<speak>
    Your user ID is 
    ${spacedOut(userId)}
    and your name is ${knownUsers[userId].givenName}.
    </speak>`;
    console.log(msg);
    app.ask(msg)
  }

  function sayName(app) {
    console.log('say name');
    if (app.isPermissionGranted()) {
      app.ask('Your name is ' + app.getUserName().displayName);
    } else {
      // Response shows that user did not grant permission
      app.ask('Sorry, I could not get your name.');
    }
  }
  // actionMap.set(REQUEST_PERMISSION_ACTION, requestPermission);
  // actionMap.set('Default Fallback Intent', requestPermission);
  actionMap.set('input.unknown', receiveLocation);
  actionMap.set('who_am_i', whoAmI);
  actionMap.set(SAY_NAME_ACTION, sayName);
  // actionMap.set('action.PERMISSION', sayName);

  app.handleRequest(actionMap);
});

function encodeAsFirebaseKey(string) {
  return string.replace(/\%/g, '%25')
    .replace(/\./g, '%2E')
    .replace(/\#/g, '%23')
    .replace(/\$/g, '%24')
    .replace(/\//g, '%2F')
    .replace(/\[/g, '%5B')
    .replace(/\]/g, '%5D');
};

// expressApp.use(logless.errorHandler);

// Start the server
let server = expressApp.listen(expressApp.get('port'), function () {
  console.log('App listening on port %s', server.address().port);
  console.log('Press Ctrl+C to quit.');
});


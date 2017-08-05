'use strict';

let verseHelper = require('./verseHelper');

const App = require('actions-on-google').ApiAiApp;
// exports.scratch1 = (request, response) => {
//   const app = new App({ request, response });


//   const actionMap = new Map();
//   actionMap.set('tell.answer', tellAnswer);
//   app.handleRequest(actionMap);
// };

let express = require('express');
let bodyParser = require('body-parser');

var lastRequestFromAnyUser = '';

let expressApp = express();
expressApp.set('port', (process.env.PORT || 8001));
expressApp.use(bodyParser.json({
  type: 'application/json'
}));


expressApp.get('/*', function (request, response) {
  console.log('incoming GET');
  var x = verseHelper.forNow(new Date()).verse;
  response.send('hello ' + x);
});

expressApp.post('/', function (request, response) {
  console.log('handle post');
  const app = new App({
    request: request,
    response: response
  });

  function tellAnswer() {
    let category = app.getArgument('s1-category');

    console.log('body', request.body)
    console.log('data', request.body.originalRequest ? request.body.originalRequest.data : '-')

    var sessionId = request.body.sessionId;
    console.log('session', sessionId);

    console.log('getDateTime', app.getDateTime())
    console.log('isInSandbox', app.isInSandbox())
    console.log('getSurfaceCapabilities', app.getSurfaceCapabilities())
    console.log('getInputType', app.getInputType())
    console.log('getDeliveryAddress', app.getDeliveryAddress())
    console.log('result.contacts', app.getDeliveryAddress())

    tell(category);
  }

  function tellAgain() {
    var repeatNum = +app.getArgument('repeatNum') || 1
    console.log('last', repeatNum, lastRequestFromAnyUser);
    tell(lastRequestFromAnyUser, true, repeatNum)
  }

  function tell(category, again, repeatNum) {
    lastRequestFromAnyUser = category, repeatNum;
    console.log(app.sessionId);
    var speak = ['<speak>'];
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
            speak.push(`<say-as interpret-as="ordinal">${r + 1}</say-as>`)
            speak.push('<break time="1s"/>');
          }
          speak.push(info.verse);
        }
      } else {
        speak.push(info.isEve
          ? "The verse for this evening is: "
          : "The verse for this morning is: ");
        speak.push('<break time="1s"/>');
        speak.push(info.verse);

        speak.push('<break time="20s"/>');
        speak.push('I can repeat that a number of times if you wish. Just let me know how many times!');
      }
    }
    if (speak.length === 1) {
      speak.push('Sorry. Did you want today\'s Verse or Date?');
    }
    speak.push('</speak>')
    app.ask(speak.join(' '));
  }









  function mainIntent() {
    console.log('mainIntent');
    let inputPrompt = app.buildInputPrompt(true, '<speak>Hi! <break time="1"/> ' +
      'I can read out an ordinal like ' +
      '<say-as interpret-as="ordinal">123</say-as>. Say a number.</speak>', ['I didn\'t hear a number', 'If you\'re still there, what\'s the number?', 'What is the number?']);

    // let permission = assistant.SupportedPermissions.NAME;
    // assistant.askForPermission('To address you by name', permission);

    app.ask(inputPrompt);
    app.tell();
  }

  function rawInput() {
    console.log('rawInput');
    console.log(app.getDeviceLocation())
    if (app.getRawInput() === 'bye') {
      app.tell('Goodbye!');
    } else {
      var x = verseHelper.forNow(new Date()).verse;
      app.tell(x);
    }
  }

  function requestPermission() {
    let permission = [
      // assistant.SupportedPermissions.DEVICE_PRECISE_LOCATION
    ];
    // assistant.askForPermissions('To pick you up', permissions);
  }

  let actionMap = new Map();
  actionMap.set('tell.answer', tellAnswer);
  actionMap.set('tell.again', tellAgain);
  // actionMap.set('request_permission', requestPermission);
  // actionMap.set(actions.intent.DATETIME, rawInput);

  app.handleRequest(actionMap);
});

// Start the server
let server = expressApp.listen(expressApp.get('port'), function () {
  console.log('App listening on port %s', server.address().port);
  console.log('Press Ctrl+C to quit.');
});
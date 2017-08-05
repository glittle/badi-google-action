// Copyright 2016, Google, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// [START app]
'use strict';

let verseHelper = require('./verseHelper');

process.env.DEBUG = 'actions-on-google:*';

let ActionsSdkAssistant = require('actions-on-google').ActionsSdkAssistant;
let express = require('express');
let bodyParser = require('body-parser');

let app = express();
app.set('port', (process.env.PORT || 8001));
app.use(bodyParser.json({
  type: 'application/json'
}));

app.get('/*', function (request, response) {
  console.log('incoming GET');
  var x = verseHelper.forNow(new Date()).verse;
  response.send('hello ' + x);
});

app.post('/', function (request, response) {
  console.log('handle post');
  const assistant = new ActionsSdkAssistant({
    request: request,
    response: response
  });

  function mainIntent(assistant) {
    console.log('mainIntent');
    let inputPrompt = assistant.buildInputPrompt(true, '<speak>Hi! <break time="1"/> ' +
      'I can read out an ordinal like ' +
      '<say-as interpret-as="ordinal">123</say-as>. Say a number.</speak>', ['I didn\'t hear a number', 'If you\'re still there, what\'s the number?', 'What is the number?']);

    // let permission = assistant.SupportedPermissions.NAME;
    // assistant.askForPermission('To address you by name', permission);

    assistant.ask(inputPrompt);
    assistant.tell();
  }

  function rawInput(assistant) {
    console.log('rawInput');
    console.log(assistant.getDeviceLocation())
    if (assistant.getRawInput() === 'bye') {
      assistant.tell('Goodbye!');
    } else {
      var x = verseHelper.forNow(new Date()).verse;
      assistant.tell(x);
    }
  }

  function requestPermission(assistant) {
    let permission = [
      // assistant.SupportedPermissions.DEVICE_PRECISE_LOCATION
    ];
    // assistant.askForPermissions('To pick you up', permissions);
  }

  let actionMap = new Map();
  // actionMap.set('request_permission', requestPermission);
  actionMap.set(assistant.StandardIntents.MAIN, rawInput);
  actionMap.set(assistant.StandardIntents.TEXT, rawInput);
  // actionMap.set(actions.intent.DATETIME, rawInput);

  assistant.handleRequest(actionMap);
});

// Start the server
let server = app.listen(app.get('port'), function () {
  console.log('App listening on port %s', server.address().port);
  console.log('Press Ctrl+C to quit.');
});
// [END app]
const App = require('actions-on-google').ApiAiApp;
const moment = require('moment-timezone');

const badiCalc = require('./badiCalc');
const verseHelper = require('./verseHelper');
const externalInfo = require('./externalInfo');
const general = require('./general');
const dbHelper = require('./db');

console.log(' ');
console.log('======= SERVER RESTARTED ==============================');

var knownUsers = null;

dbHelper.knownUsersRef.once('value', function (snapshot) {
    knownUsers = snapshot.val() || {};
    console.log('initial update from db', Object.keys(knownUsers).length, knownUsers);
});


function handlePost(request, response) {

    var now = new Date();

    console.log('\r\n\r\n---------------------------');
    console.log('------ incoming POST ------');
    console.log(`---${now.toLocaleTimeString()}---`);
    const app = new App({
        request: request,
        response: response
    });
    console.log('intent:', app.getIntent());
    console.log('intent name:', request.body.result.metadata.intentName);



    // console.log(JSON.stringify(request.body));

    // console.log('users', knownUsers);

    // determine who this is
    var userId = general.extractUserId(app, request);
    // console.log('userId', userId)
    var userInfo = knownUsers[userId];
    if (!userInfo) {
        userInfo = knownUsers[userId] = {};
    }
    console.log('initial user', userInfo);

    var userRef = dbHelper.knownUsersRef.child(userId);
    userRef.update({ last_access: now })
    userInfo.last_access = now;

    // console.log(app.getUser())

    // try {
    //   console.log(4)
    //   app.askForPermission('To address you by name', [app.SupportedPermissions.NAME]);
    //   console.log(5);
    // } catch (error) {
    //   console.log(3, error)
    // }

    function welcome() {
        // console.log('default welcome')
        if (!userInfo || !userInfo.coord) {
            console.log('asking for location')
            // app.ask(
            //     {
            //         speech: 'allow abbha!',
            //         displayText: 'Alláh-u-Abhá!'
            //     }
            // );
            app.askForPermission('To know sunset times where you are', app.SupportedPermissions.DEVICE_PRECISE_LOCATION);
            return;
        } else {
            // console.log('set context 1')
            app.setContext('location_known', 99, userInfo.coord);
            // console.log('set context 2')
            app.ask({
                speech: '<speak>allowabha! Welcome back! What would you like to hear?</speak>',
                displayText: 'Alláh-u-Abhá! Welcome back! What would you like to hear?',
                followupEvent: {
                    name: "givePrompt"
                }
            })
            // console.log('set context 3')
        }
    }


    function tellAnswer() {
        let topic = app.getArgument('topic');

        // console.log('body', request.body)
        // console.log('data', request.body.originalRequest ? request.body.originalRequest.data : '-')

        var sessionId = request.body.sessionId;
        // console.log('session', sessionId);

        // console.log('getDateTime', app.getDateTime())
        // console.log('isInSandbox', app.isInSandbox())
        // console.log('getSurfaceCapabilities', app.getSurfaceCapabilities())
        // console.log('getInputType', app.getInputType())
        // console.log('getDeliveryAddress', app.getDeliveryAddress())
        // console.log('result.contacts', app.getDeliveryAddress())

        tell(topic);
    }

    function tellAgain() {
        var repeatNum = +app.getArgument('repeatNum') || 1
        console.log('last', repeatNum, userInfo.lastRequest);
        tell(userInfo.lastRequest.topic, true, repeatNum)
    }

    function tell(topic, again, repeatNum) {
        var last = userInfo.lastRequest;
        if (!last) {
            last = userInfo.lastRequest = { times: 1 };
        }
        last.topic = topic;
        last.times++;

        const voiceVerse = '<voice gender="male" variant="2">';
        const voiceNormal = voiceVerse; //'<voice gender="female" variant="2">';

        var speak = ['<speak>'];
        speak.push(voiceNormal);

        if (topic === 'date' || topic === 'both') {
            badiCalc.addTodayInfoToAnswers(userInfo, speak);
        }
        if (topic === 'both') {
            speak.push('<break time="3s"/>');
        }
        if (topic === 'verse' || topic === 'both') {
            // app1.ask('The verse is...');
            var now = moment.tz(userInfo.zoneName);
            console.log('verse at', now);
            var info = verseHelper.forNow(now);
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
                speak.push('</voice>');
                speak.push(voiceVerse);
                speak.push(info.verse);
                speak.push('</voice>');
                speak.push(voiceNormal);

                speak.push('\n\n\n<break time="20s"/>');
                speak.push('(I can repeat that a number of times if you wish. Just let me know how many times!)');
            }
        }
        if (speak.length === 1) {
            speak.push('Sorry. Did you want today\'s Verse or Date?');
        }
        speak.push('</voice></speak>')
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


    // console.log(1)
    // if (app.isPermissionGranted()) {
    //   console.log(2)
    //   let displayName = app.getUserName().displayName;
    //   let deviceCoordinates = app.getDeviceLocation().coordinates;
    //   console.log(displayName);
    //   console.log(deviceCoordinates);
    // }
    // actionMap.set('request_permission', requestPermission);

    function receiveLocation(app) {
        if (app.isPermissionGranted()) {
            /*
                "coordinates": {
                  "latitude": 51.1004367,
                  "longitude": -113.95960439999999
                }
            */
            var coordRaw = app.getDeviceLocation().coordinates;
            var coord = {
                lat: coordRaw.latitude,
                lng: coordRaw.longitude
            };

            var userInfo = knownUsers[userId];
            userRef.update({ coord: coord });
            userInfo.coord = coord;

            externalInfo.getTimezoneInfo(userRef, userInfo);
            externalInfo.getLocationName(userRef, userInfo);

            app.ask({
                speech: '<speak>Okay, we are all set! Would you like to hear the verse or the date?</speak>',
                displayText: 'Okay, we are all set! Would you like to hear the verse or the date?',
                followupEvent: {
                    name: "givePrompt" // not working
                }
            })

        } else {
            app.tell('Sorry, I\'m a bit confused right now and have to go. Please call for me when you want to try again!');
        }
    }

    function spacedOut(s) {
        return s.split('').join(' ');
    }
    function whoAmI(app) {
        //    <say-as interpret-as="characters">${spacedOut(userId)}</say-as>
        var msg = `<speak>
    Your user ID is 
    ${spacedOut(userId)}
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


    let actionMap = new Map();
    actionMap.set('input.welcome', welcome);
    actionMap.set('input.welcome.fallback', receiveLocation);

    actionMap.set('tell.answer', tellAnswer);
    actionMap.set('get_answer', tellAnswer);
    actionMap.set('tell.again', tellAgain);
    actionMap.set('who_am_i', whoAmI);

    actionMap.set('get_name', sayName);

    app.handleRequest(actionMap);
}


module.exports = {
    handlePost
}

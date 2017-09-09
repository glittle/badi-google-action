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

dbHelper.knownUsersRef.once('value', function(snapshot) {
    knownUsers = snapshot.val() || {};
    console.log('initial load from db', Object.keys(knownUsers).length, 'users.');
    console.log(knownUsers);
});


function handlePost(request, response) {

    var now = new Date();
    var body = request.body;

    // console.log(request)
    // console.log('address', request.connection.remoteAddress)

    console.log('\r\n\r\n---------------------------');
    console.log('------ incoming POST ------');
    console.log(`---${now.toLocaleTimeString()}---`);
    const app = new App({
        request: request,
        response: response
    });
    console.log('Intent:', app.getIntent());
    console.log('Intent name:', body.result.metadata.intentName);
    console.log('From:', body.originalRequest.source, " Version:", body.originalRequest.version);
    console.log('Parameters:', body.result.parameters);
    console.log('Body', JSON.stringify(body));

    // console.log('users', knownUsers);

    // determine who this is
    var userId = general.extractUserId(app, request);
    // console.log('userId', userId)
    var userInfo = knownUsers[userId];
    if (!userInfo) {
        userInfo = knownUsers[userId] = { times: 1 };
    }
    console.log('userInfo', userInfo);

    var userRef = dbHelper.knownUsersRef.child(userId);

    var times = userInfo.times || 1;
    userRef.update({ last_access: now, times: times })
    userInfo.last_access = now;
    userInfo.times = times;

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
            app.askForPermission('Hello! Welcome to the "Wondrous Calendar"!  Before we get started, to give you correct answers, ', app.SupportedPermissions.DEVICE_PRECISE_LOCATION);
            return;
        } else {
            // app.setContext('location_known', 99, userInfo.coord);
            askWithoutWhatElse([
                `allowabha! What would you like to hear? Say \'Help\' if you would like some tips!`
            ], [
                'Alláh-u-Abhá! What would you like to hear?\n\nSay "help" if you would like some tips!'
            ])
        }
    }

    function tellVerse() {
        tell('verse');
    }

    function tellDate() {
        tell('date');
    }

    function tellDateFull() {
        var speech = [];
        var text = [];

        var useArNames = body.result.parameters.language === 'arabic';

        badiCalc.addTodayDetails(useArNames, userInfo, speech, text);
        ask(speech, text);
    }
    // function tellAnswer() {
    //     let topic = app.getArgument('topic');

    //     // console.log('body', request.body)
    //     // console.log('data', request.body.originalRequest ? request.body.originalRequest.data : '-')

    //     var sessionId = request.body.sessionId;
    //     // console.log('session', sessionId);

    //     // console.log('getDateTime', app.getDateTime())
    //     // console.log('isInSandbox', app.isInSandbox())
    //     // console.log('getSurfaceCapabilities', app.getSurfaceCapabilities())
    //     // console.log('getInputType', app.getInputType())
    //     // console.log('getDeliveryAddress', app.getDeliveryAddress())
    //     // console.log('result.contacts', app.getDeliveryAddress())

    //     tell(topic);
    // }

    function tellAgain() {
        var repeatNum = +app.getArgument('repeatNum') || 1
        console.log('last', repeatNum, userInfo.lastRequest);
        var lastTopic = userInfo.lastRequest || 'verse';
        tell(lastTopic, true, repeatNum)
    }

    function tell(topic, again, repeatNum) {
        userRef.update({ lastRequest: topic });
        userInfo.lastRequest = topic;

        const voiceNormal = '<voice gender="female" variant="2">';
        const voiceVerse = '<voice gender="male" variant="2">';
        const voiceEnd = '</voice>';

        var speech = [];
        var text = [];
        speech.push(voiceNormal);

        if (topic === 'date' || topic === 'both') {
            badiCalc.addTodayInfoToAnswers(userInfo, speech, text);
        }
        if (topic === 'both') {
            speech.push('<break time="3s"/>');
            text.push('\n')
        }
        if (topic === 'verse' || topic === 'both') {
            var now = moment.tz(userInfo.zoneName);
            var info = verseHelper.forNow(now, body.result.parameters.verseTime);
            if (again) {
                repeatNum = repeatNum || 1;
                for (var r = 0; r < repeatNum; r++) {
                    if (r > 0) {
                        speech.push('<break time="5s"/>');
                        text.push('\n  \n  \n')
                    }
                    if (r > 0 || repeatNum > 1) {
                        speech.push(`<say-as interpret-as="ordinal">${r + 1}</say-as>`)
                        text.push(`${r + 1}:\n`)
                        speech.push('<break time="1s"/>');
                    }
                    speech.push(voiceEnd);
                    speech.push(voiceVerse);

                    speech.push(general.cleanVerseForSpeech(info.verse));
                    text.push(info.verse);

                    speech.push(voiceEnd);
                    speech.push(voiceNormal);

                }
            } else {
                const intro = info.forEvening ?
                    "The evening verse for today is: " :
                    "The morning verse for today is: ";
                speech.push(intro);
                text.push(intro + '\n\n');
                speech.push('<break time="1s"/>');
                speech.push(voiceEnd);

                speech.push(voiceVerse);

                speech.push(general.cleanVerseForSpeech(info.verse));
                text.push(info.verse);
                // speak.push(` - Bahá'u'lláh.  `);

                speech.push(voiceEnd);
                speech.push(voiceNormal);

                speech.push('<break time="2s"/>');
                speech.push('(We can repeat that a number of times if you wish. Just let me know how many times!)');
                text.push('\n  \n  \n(We can repeat that a number of times if you wish. Just let me know how many times!)');
            }
        }

        if (speech.length <= 2) {
            general.addToBoth(`Sorry, I didn't understand that. Please try again!`, speech, text);
        } else {
            addWhatElse(speech, text);
        }

        speech.push(voiceEnd);

        askWithoutWhatElse(speech, text);
    }

    function askWithoutWhatElse(speech, text) {
        ask(speech, text, true)
    }

    function ask(speech, text, doNotAddWhatElse) {
        if (!doNotAddWhatElse) {
            addWhatElse(speech, text);
        }

        speech = speech.join(' ');
        text = text.join(' ');
        app.ask({
            speech: '<speak>' + speech + '</speak>',
            displayText: text
        });
        console.log('Text', text)
        console.log('Speech', speech)
    }

    function addWhatElse(speech, text) {
        const msgs = [
            'What else would you like to hear?',
            'What else would you like to know?',
            'What else would you like to learn?',
            'What else can I tell you?',
            'What more can I tell you?'
        ]
        var max = msgs.length;
        var msg = msgs[Math.floor(Math.random() * (max - 1))];

        speech.push('<break time="2s"/>' + msg);
        text.push('\n\n' + msg);
    }

    function receiveLocation() {
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

            var msg = [`Thank you!  I've got it! What would you like to hear now?  Say Help if you want to learn what I can do.`];
            askWithoutWhatElse(msg, msg);

        } else {
            var msg = [`Sorry, I didn't catch that. Please try again!`];
            askWithoutWhatElse(msg, msg);
        }
    }

    function spacedOut(s) {
        return s.split('').join(' ');
    }

    function whoAmI(app) {
        //    <say-as interpret-as="characters">${spacedOut(userId)}</say-as>
        var speech = [userId !== 'sandbox' ?
            `Your user ID is ${spacedOut(userId)}<break time="2s"/> (Wow! That was quite a mouthful!)` :
            `You are using the sandbox, you don't have an ID.`
        ];

        var text = [userId !== 'sandbox' ?
            `Your user ID is ${userId}.` :
            `You are using the sandbox, you don't have an ID.`
        ];

        ask(speech, text)
    }

    function tellMonthNames() {
        var lang = app.getArgument('language') || 'english';
        var doBoth = lang === 'both';
        var list = lang === 'arabic' ? badiCalc.monthsArabic : badiCalc.monthsEnglish;

        console.log(lang, list);

        var speech = [];
        var text = [];

        // if (lang === 'arabic') {
        //     speak.push('(Please excuse my pronounciation!) ')
        // }
        general.addToBoth('Here are the names of the months in the Wondrous Calendar:\n', speech, text);
        for (var i = 1; i < list.length; i++) {
            var item = list[i];
            item = item.replace(/[`’]/g, '');

            speech.push(`${i}<break time="1s"/>`);
            text.push(`${i}: `);

            if (doBoth) {
                // element is already in English
                var ar = badiCalc.monthsArabic[i].replace(/[`’]/g, '');

                speech.push(`${ar} <break time=".5s"/> ${item}`);
                text.push(`${ar} - ${item}\n`);

            } else {
                speech.push(`${item}`);
                text.push(`${item}\n`);
            }
            speech.push(`<break time="2s"/>`);

        }

        ask(speech, text);
    }

    function resetLocation() {
        var userInfo = knownUsers[userId];
        delete userInfo.coord;
        delete userInfo.location;
        delete userInfo.zoneName;
        userRef.set(userInfo);

        app.askForPermission('Sure. ', app.SupportedPermissions.DEVICE_PRECISE_LOCATION);
    }

    function tellLocation() {
        var speech = [];
        var text = [];
        if (userInfo.location) {
            speech.push(`From what I've learned, you are in ${userInfo.location}.`);
            text.push(`From what I've learned, you are in ${userInfo.location}.`);
        } else {
            speech.push(`Sorry, I don't know where you are!`);
            text.push(`Sorry, I don't know where you are!`);
        }

        if (userInfo.zoneName) {
            speech.push(`You are in the ${userInfo.zoneName.replace(/\//, ': ').replace(/_/g, ' ')} timezone.`);
            text.push(`You are in the ${userInfo.zoneName} timezone.`);

            var now = moment.tz(userInfo.zoneName);
            var time = now.format('h:mm a')

            speech.push(`It is about <say-as interpret-as="time" format="hms12">${time}</say-as> right now.`);
            text.push(`It is about ${time} right now.`);

        } else {
            speech.push(`I don't know what timezone you are in.`);
            text.push(`I don't know what timezone you are in.`);
        }

        ask(speech, text);
    }


    function tellUsers() {
        var speech = [];
        var text = [];

        var locations = {};
        const somewhere = 'an unknown location';

        Object.keys(knownUsers).forEach(function(key) {
            var u = knownUsers[key];
            var loc = u.location || somewhere;
            if (loc) {
                if (locations[loc]) {
                    locations[loc]++;
                } else {
                    locations[loc] = 1;
                }
            }
        });
        var array = [];
        Object.keys(locations).forEach(function(key) {
            var num = locations[key];
            array.push(`${num} from ${key}`)
        });
        array.sort(function(a, b) {
            if (a === somewhere) return 1;
            return a <= b ? -1 : 1
        });
        if (array.length > 1) {
            array[array.length - 1] = 'and ' + array[array.length - 1];
        }

        speech.push(`I've talked to ${Object.keys(knownUsers).length} people so far! ${array.join(', ')}.`);

        text.push(`I've talked to ${Object.keys(knownUsers).length} people so far! \n${array.join('\n')}.`);

        ask(speech, text);
    }

    function tellSunset() {
        var speech = [];
        var text = [];

        badiCalc.addSunTimes(userInfo, speech, text);

        ask(speech, text);
    }

    let actionMap = new Map();
    actionMap.set('input.welcome', welcome);
    actionMap.set('Welcome.Welcome-fallback', receiveLocation);

    // actionMap.set('tell.answer', tellAnswer);
    // actionMap.set('get_answer', tellAnswer);

    actionMap.set('get.verse', tellVerse);
    actionMap.set('get.date', tellDate);
    actionMap.set('get.date.full1', tellDateFull);

    actionMap.set('tell.again', tellAgain);

    actionMap.set('get.names', tellMonthNames);

    actionMap.set('change.location', resetLocation);
    actionMap.set('Changelocation.Changelocation-fallback', receiveLocation);

    actionMap.set('where.am.i', tellLocation);
    actionMap.set('when.is.sunset', tellSunset);

    actionMap.set('who_am_i', whoAmI);
    actionMap.set('user.list', tellUsers);

    app.handleRequest(actionMap);
}


module.exports = {
    handlePost
}
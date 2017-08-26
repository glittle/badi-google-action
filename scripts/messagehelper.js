// adapted from chrome extension
const messages = require('./../assets/en/messages.json');

const general = require('./general');

function getMessage(key, obj, defaultValue) {
    var resource = messages[key];
    var rawMsg = resource ? resource.message : '';
    if (!rawMsg) {
        console.log('missing resource:', key)
    }

    var msg = rawMsg || defaultValue || '{' + key + '}';
    if (obj === null || typeof obj === 'undefined' || msg.search(/{/) === -1) {
        return msg;
    }

    var before = msg;
    var repeats = 0;
    while (repeats < 5) { // failsafe
        msg = msg.filledWith(obj);
        if (msg === before) {
            return msg;
        }
        if (msg.search(/{/) === -1) {
            return msg;
        }
        before = msg;
        repeats++;
    }
    return msg;

}

module.exports.get = getMessage;
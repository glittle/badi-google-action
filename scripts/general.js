const externalInfo = require('./externalInfo');
//const timezonedb = require('timezonedb-node')(process.env.timeZoneKey);

function encodeAsFirebaseKey(string) {
    return string.replace(/\%/g, '%25')
        .replace(/\./g, '%2E')
        .replace(/\#/g, '%23')
        .replace(/\$/g, '%24')
        .replace(/\//g, '%2F')
        .replace(/\[/g, '%5B')
        .replace(/\]/g, '%5D');
};

function getOrdinal(num) {
  return ['','st','nd','rd'][num] || 'th';
}

function getLocationInfo(userRef, userInfo) {

    externalInfo.getTimezoneInfo(userRef, userInfo);
    externalInfo.getLocationName(userRef, userInfo);

    // timezonedb.getTimeZoneData(userInfo.coord,
    //     function (error, tzInfo) {
    //         if (!error) {
    //             console.log(tzInfo);

    //             var userOffset = tzInfo.gmtOffset / 3600;
    //             var serverTz = new Date().getTimezoneOffset() / 60;
    //             var hourDifference = serverTz + userOffset;

    //             tzInfo.serverDiff = hourDifference;

    //             userInfo.tzInfo = tzInfo;
    //             userRef.update({ tzInfo: tzInfo });

    //         } else {
    //             console.error(error);
    //         }
    //     });

}


function extractUserId(app, request) {
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
    return encodeAsFirebaseKey(id);
}



module.exports = {
    getLocationInfo,
    extractUserId,
    getOrdinal
};
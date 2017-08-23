// https://www.npmjs.com/package/node-rest-client

const Client = require('node-rest-client').Client;

function getTimezoneInfo(userRef, userInfo) {
    var coord = userInfo.coord;

    // refernce https://timezonedb.com/references/get-time-zone

    var caller = new Client();
    var params = {
        key: process.env.timeZoneKey,
        format: 'json',
        fields: 'zoneName,formatted',
        by: 'position',
        lat: coord.lat,
        lng: coord.lng,
    };
    var host = 'http://api.timezonedb.com/v2/get-time-zone?';
    var query = toQueryString(params);

    console.log('timezonedb query', query);

    caller.get(host + query, function (data, response) {
        // parsed response body as js object 
        console.log('timezonedb', data);

        userInfo.zoneName = data.zoneName;
        userRef.update({ zoneName: data.zoneName });
    });
}

function getLocationName(userRef, userInfo) {
    var coord = userInfo.coord;

    var caller = new Client();
    var url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${coord.lat},${coord.lng}`;

    console.log('Determining name')

    caller.get(url, function (data, response) {
        // console.log('maps', data)

        var results = data.results;
        var location = '';

        // get longest locality
        for (var r = 0; r < results.length; r++) {
            var components = results[r].address_components;
            for (var i = 0; i < components.length; i++) {
                var component = components[i];
                if (component.types.includes('locality')) { //$.inArray('political', component.types)!=-1 &&
                    if (component.short_name.length > location.length) {
                        location = component.short_name;
                    }
                }
            }
        }

        if (!location) {
            location = '(unknown)'
        }

        console.log('==> ', location);

        userInfo.location = location;
        userRef.update({ location: location });
    });

}

function toQueryString(obj) {
    return Object.keys(obj).map(k => {
        return encodeURIComponent(k) + "=" + encodeURIComponent(obj[k])
    })
        .join("&");
}



module.exports = {
    getTimezoneInfo,
    getLocationName
};
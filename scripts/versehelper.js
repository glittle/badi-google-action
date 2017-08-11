let verses = require('./../assets/verses.json');

function forNow(date) {
    // var key = '5.3';//sample
    var key = (date.getMonth() + 1) + '.' + date.getDate();
    var isEve = date.getHours() > 12;
    var dayVerses = verses[key];

    // console.log(date, date.getHours(), key, isEve, dayVerses)

    if (dayVerses) {
        var verseInfo = dayVerses[isEve ? 'pm' : 'am'];

        if (verseInfo) {
            return {
                suffix: `Bahá'u'lláh, ${verseInfo.r}`,
                isEve: isEve,
                verse: verseInfo.q
            }
        }
    }
    return {};
}

module.exports.forNow = forNow;
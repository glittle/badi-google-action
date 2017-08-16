const verses = require('./../assets/verses.json');

function forNow(mDate) {
    // var key = '5.3';//sample
    var key = mDate.format('M.d');
    var isEve = mDate.hour() > 15; // 4 pm and later?
    var dayVerses = verses[key];

    console.log('verse', mDate, mDate.hour(), key, isEve, dayVerses)

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
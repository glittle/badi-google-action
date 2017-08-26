const verses = require('./../assets/verses.json');

function forNow(mDate, morningOrEvening) {
    // var key = '5.3';//sample
    var key = mDate.format('M.D');
    var forEvening = morningOrEvening ?
        morningOrEvening === 'evening' :
        mDate.hour() >= 14; // 3 pm and later?
    var dayVerses = verses[key];

    console.log('verse', mDate.format(), mDate.hour(), key, forEvening, dayVerses)

    if (dayVerses) {
        forEvening
        var verseInfo = dayVerses[forEvening ? 'pm' : 'am'];

        if (verseInfo) {
            forEvening
            return {
                suffix: `Bahá'u'lláh, ${verseInfo.r}`,
                forEvening: forEvening,
                verse: verseInfo.q
            }
            forEvening
        }
    }
    return {};
}

module.exports.forNow = forNow;
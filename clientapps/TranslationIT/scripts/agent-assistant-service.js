/**
 * This is a module that manages translation.
 * It listens for messages from the customer and translates 
 * for the agent.
 */

let customerLanguage = 'en';

export default {
    /**
     * Translates the text
     * @param {String} origText the text to be translated
     * @returns {String} the translation of origText 
     */
    translateTextFromCustomer(origText, callback){
        let response = '';
        let agentLanguage = 'en';

        var urlA = 'https://translation.googleapis.com/language/translate/v2?key=AIzaSyAx2ZrjAsCcLl3m-vVzGFlukWBWc5SuGs8&target=' + agentLanguage + '&q=' + origText;
        //console.log('##: urlA: ' , urlA);

        $.ajax({
            url: urlA,
            aync: true,
            success: function(data) {
                //console.log('## translation: ', data, data.data.translations[0].translatedText);
                customerLanguage = data.data.translations[0].detectedSourceLanguage;

                // do this to remove special characters
                response = $('<textarea />').html(data.data.translations[0].translatedText).text();
                return callback( response );
            },
            error: function(data) {
                console.log('## translation: error', data);
                return callback( response );
            }
        });
    },

    /**
     * Translates the text
     * @param {String} origText the text to be translated
     * @returns {String} the translation of origText 
     */
    translateTextFromAgent(origText, callback){
        let response = '';

        var urlA = 'https://translation.googleapis.com/language/translate/v2?key=AIzaSyAx2ZrjAsCcLl3m-vVzGFlukWBWc5SuGs8&target=' + customerLanguage + '&q=' + origText;
        //console.log('##: urlA: ' , urlA);

        $.ajax({
            url: urlA,
            aync: true,
            success: function(data) {
                //console.log('## translation: ', data, data.data.translations[0].translatedText);
                response = $('<textarea />').html(data.data.translations[0].translatedText).text();
                return callback( response );
            },
            error: function(data) {
                console.log('## translation: error', data);
                return callback( response );
            }
        });
    }    
}
/**
 * This code handles the translation functionality in the client web app
 */

const platformClient = require('platformClient');
const conversationsApi = new platformClient.ConversationsApi();

export default {
    sendMessage(message, conversationId, communicationId){
        conversationsApi.postConversationsChatCommunicationMessages(
            conversationId, communicationId,
            {
                "body": message,
                "bodyType": "notice"
            }
        )
    }
}
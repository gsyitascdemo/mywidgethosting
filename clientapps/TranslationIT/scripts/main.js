// This handles the Agent Assistant functionality in the client web app
import agentAssistant from './agent-assistant.js';
import assistService from './agent-assistant-service.js';
import controller from './notifications-controller.js';
import view from './view.js';

// Obtain a reference to the platformClient object
const platformClient = require('platformClient');
const client = platformClient.ApiClient.instance;

// Set Genesys Cloud settings - point to the correct region
client.setEnvironment(platformClient.PureCloudRegionHosts.eu_west_1);        //replace with your PureCloudRegionHosts-Region

// API instances
const usersApi = new platformClient.UsersApi();
const conversationsApi = new platformClient.ConversationsApi();

let userId = '';
let agentID;
let conversation;
let currentConversationId = '';

let chatConversations = []; // Chat conversations handled by the user
let activeChatId = ''; // Chat that is in focus on the UI
let activeCommunicationId = '';

/**
 * Callback function for 'message' and 'typing-indicator' events.
 * For this sample, it will merely display the chat message into the page.
 * 
 * @param {Object} data the event data  
 */
let onMessage = (data) => {
    console.log('##: onMessage()', data);


    switch(data.metadata.type){
        case 'typing-indicator':
            console.log("##: onMessage(): typing indicator");
            break;
        case 'message':
            console.log("##: onMessage(): message");
            // Values from the event
            let eventBody = data.eventBody;
            let message = eventBody.body;
            let messageType = eventBody.bodyType;
            let convId = eventBody.conversation.id;
            let senderId = eventBody.sender.id;

            // Conversation values for cross reference
            let participant = conversation.participants.find(p => p.chats[0].id == senderId);
            let name = participant.name;
            let purpose = participant.purpose;

            // Get agent communication ID - guess we need this is order to be able to send on behalf of the agent
            if (purpose == 'agent') {
                agentID = senderId;
            } else {
                //let agent = conversation.participants.find(p => p.purpose == 'agent');
                //agentID = agent.chats[0].id;

                // only add non-agent messages to the transcript as we will handle agent messages

            }

            // it is a double translation for the agent message but ok for now
            view.addChatMessage(name, message, convId, purpose);

            // Get the translation for the customer message
            // need to check the bodyType to make sure we are not translating system messages
//            if ((purpose == 'customer') && (messageType == 'standard')) {
//                console.log("##: customer purpose - customer sent the message");
//                agentAssistant.getTranslation(message, convId, senderId);
//            }

            break;
    }
};

/**
 * Set the focus to the specified chat conversation.
 * @param {String} conversationId conversation id of the new active chat
 */
function setActiveChat(conversationId){
    console.log('##: setActiveChat()', conversationId);

    // Store global references to the current chat conversation
    conversation = chatConversations.find(c => c.id == currentConversationId);

    activeChatId = conversationId;
    activeCommunicationId = conversation.participants.slice().reverse()
                                    .find(p => p.purpose == 'agent').chats[0].id;
    let agent = conversation.participants.find(p => p.purpose == 'agent');
    agentID = agent.chats[0].id;

    return conversationsApi.getConversationsChatMessages(conversationId)
    .then((data) => {
        // Get messages and display to page
        view.makeTabActive(conversationId);
        view.displayTranscript(data.entities, conversation);
    });
}

/**
 * Should be called when there's a new conversation. 
 * Will store the conversations in a global array.
 * @param {String} conversationId Genesys Cloud conversationId
 */
function registerConversation(conversationId){
    console.log('##: registerConversation()', conversationId);
    
    return conversationsApi.getConversation(conversationId)
        .then((data) => chatConversations.push(data));
}

/**
 * Get already existing chat conversations
 */
function processExistingChat(conversationId){
    console.log('##: processExistingChat()', conversationId);

    return conversationsApi.getConversationsChat(conversationId)
    .then((data) => {
        let promiseArr = [];

        promiseArr.push(registerConversation(data.id));

        controller.addSubscription(
            `v2.conversations.chats.${data.id}.messages`,
            onMessage);

        view.populateActiveChatList(data, setActiveChat);

        return Promise.all(promiseArr);
    })
    .then(() => {
        // Set the first one as the active one
        if(chatConversations.length > 0){
            setActiveChat(chatConversations[0].id);
        }
    })

}

/**--------------------------------------------------------
 *                NOTIFICATIONS SECTION
 * ---------------------------------------------------------
 */

/**
 * Set-up the channel for chat conversations
 */
function setupChatChannel(){
    console.log('##: setupChatChannel()');

    return controller.createChannel()
    .then(data => {
        // Subscribe to incoming chat conversations
        return controller.addSubscription(
            `v2.users.${userId}.conversations.chats`, onChatConversationEvent)
    });
}

/**
 * Calback function to when a chat conversation event occurs 
 * for the current user
 * @param {Object} event The Genesys Cloud event
 */
function onChatConversationEvent(event){
    console.log('##: onChatConversationEvent()');

    let conversation = event.eventBody;
    let participants = conversation.participants;
    let conversationId = conversation.id;

    console.log(conversation);

    // Get the last agent participant. This happense when a conversation
    // has multiple agent participants, we need to get the latest one.
    let agentParticipant = participants.slice().reverse().find(
        p => p.purpose == 'agent');
    let customerParticipant = participants.find(
        p => p.purpose == 'customer');
    // Value to determine if conversation is already taken into account before
    let isExisting = chatConversations.map((conv) => conv.id)
                        .indexOf(conversationId) != -1;

    // Once agent is connected subscribe to the conversation's messages 
    if(agentParticipant.state == 'connected' && 
            customerParticipant.state == 'connected' && 
            !isExisting){
        // Add conversationid to existing conversations array
        console.log ('Event Connected --> fired up');
		window.open('https://www.google.com', '_blank');
		return registerConversation(conversation.id)
        .then(() => {
            // Add conversation to tab
            let participant = conversation.participants.filter(
                participant => participant.purpose === "customer")[0];
            view.addCustomerList(participant.name, conversation.id, setActiveChat);

            return addSubscription(
                `v2.conversations.chats.${conversationId}.messages`,
                onMessage);
        })
    }

    // If agent has multiple interactions,
    // open the active conversation based on Genesys Cloud
    if(agentParticipant.state == 'connected' && customerParticipant.state == 'connected' && agentParticipant.held == false){
        setActiveChat(conversationId);
    }

    // If chat has ended remove the tab and the chat conversation
    if(agentParticipant.state == 'disconnected' && isExisting){
		window.open('https://www.google.com', '_blank');
		view.removeTab(conversationId);
		chatConversations = chatConversations.filter(c => c.id != conversationId);
        if(chatConversations.length > 0){
            setActiveChat(chatConversations[0].id);
        }
    }
}

/** --------------------------------------------------------------
 *                       INITIAL SETUP
 * -------------------------------------------------------------- */
const urlParams = new URLSearchParams(window.location.search);
currentConversationId = urlParams.get('conversationid');

 client.loginImplicitGrant(
    'f0c680f2-f922-42c3-9b27-10ad7bb2a5dd', 						//replace with your clientID
    'https://gsyitascdemo.github.io/mywidgethosting/clientapps/TranslationIT/main.html',					////replace localhost with your host endpoint
    { state: currentConversationId })
.then(data => {
    console.log(data);

    // Assign conversation id
    currentConversationId = data.state;
    
    // Get Details of current User
    return usersApi.getUsersMe();
}).then(userMe => {
    userId = userMe.id;

    // Get current conversation
    return conversationsApi.getConversation(currentConversationId);
}).then(() => { 
    //currentConversation = conv;

    // Setup notification
    return setupChatChannel();
}).then(() => { 
    
    // Get current chat conversations
    return processExistingChat(currentConversationId);   
}).then(() => {

    console.log('Finished Setup');

    // setup the submit form
    function submitOnEnter(event){
        if(event.which === 13){
            event.target.form.dispatchEvent(new Event("submit", {cancelable: true}));
            event.preventDefault(); // Prevents the addition of a new line in the text field (not needed in a lot of cases)
        }
    }
    
    document.getElementById("usermsg").addEventListener("keypress", submitOnEnter);
    
    document.getElementById("form").addEventListener("submit", (event) => {
        event.preventDefault();

        let message = document.getElementById("usermsg").value;
        console.log("form submitted", message);
        document.getElementById("usermsg").value = "";

        // get the translation, send to the customer and post to the transcipt
        assistService.translateTextFromAgent(message, function(translation){
            console.log('##: getTranslation response: ', translation);

            // now send the translation to the screen and the message to the customer

            agentAssistant.sendMessage(translation, currentConversationId, agentID);
        });

    });    

// Error Handling
}).catch(e => console.log(e));

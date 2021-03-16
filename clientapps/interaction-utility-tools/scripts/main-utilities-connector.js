// This handles the Agent Assistant functionality in the client web app
import controller from './notifications-controller.js';

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

let chatConversations = []; // Chat conversations handled by the user
let activeChatId = ''; // Chat that is in focus on the UI
let activeCommunicationId = '';

/** --------------------------------------------------------------
 *                       INITIAL SETUP
 * -------------------------------------------------------------- */
 
 client.loginImplicitGrant(
    'f0c680f2-f922-42c3-9b27-10ad7bb2a5dd', 						//replace with your clientID
    'https://gsyitascdemo.github.io/mywidgethosting/clientapps/',					////replace localhost with your host endpoint
	)

.then(data => {
    console.log(data);

    // Get Details of current User
    return usersApi.getUsersMe();
})
.then(userMe => {
    userId = userMe.id;
})
.then(() => { 
    // Setup notification
    return setupChatChannel();
})
.then(() => {

    console.log('Finished Setup for custom event listener v1.1 - Everything is up & running');   

// Error Handling

}).catch(e => console.log(e));

/**--------------------------------------------------------
 *                COMMANDS SECTION
 * ---------------------------------------------------------
 */

function initiateOutboundEmail(emailToAddress){
    console.log('##: initiateOutboundEmailCommand Pressed()');
	
	let emailData = {
		queueId: '38d37d70-7963-4d62-8a19-74563fa74e20',
		toAddress: emailToAddress,
		toName: 'Danilo Bianchi',
	//	fromAddress: 'no-reply@mypurecloud.com',
		fromName: 'Support Service',
		subject: 'New Email Outbound Subject',
		direction: 'OUTBOUND'
	};

	conversationsApi.postConversationsEmails(emailData)
		.then((conversation) => {
			const conversationId = conversation.id;
			console.log(`Created email, conversation id:${conversationId}`);
		})
		.catch((err) => console.log(err));
}

function initiateOutboundSMS(smsToNumber, extContactId){
    console.log('##: initiateOutboundSMS Command Pressed()');
	
	let smsData = {
		queueId: '38d37d70-7963-4d62-8a19-74563fa74e20',
		toAddress: smsToNumber,
		toAddressMessengerType: 'sms',
		externalContactId: extContactId
	};

	conversationsApi.postConversationsEmails(smsData)
		.then((conversation) => {
			const conversationId = conversation.id;
			console.log(`Created sms, conversation id:${conversationId}`);
		})
		.catch((err) => console.log(err));
}

function initiateOutboundCall(callToNumber, extContactId){
    console.log('##: initiateOutboundCall Command Pressed()');
	
	let callData = {
		 phoneNumber: callToNumber, 
	//	"callerId": String, 
	//	"callerIdName": String, 
		callFromQueueId: '38d37d70-7963-4d62-8a19-74563fa74e20', 
		callQueueId: '38d37d70-7963-4d62-8a19-74563fa74e20', 
		callUserId: userId, 
	//	"priority": Number, 
	//	"languageId": String, 
	//	"routingSkillsIds": [String], 
	//	"conversationIds": [String], 
		participants: { 
				address: 'Viale Giorgio Ribotta 21', 
				name: 'Danilo Bianchi', 
				userId: extContactId, 
				queueId: '38d37d70-7963-4d62-8a19-74563fa74e20'
		}
	};

	conversationsApi.postConversationsCalls(callData)
		.then((conversation) => {
			const conversationId = conversation.id;
			console.log(`Created outbound call, conversation id:${conversationId}`);
		})
		.catch((err) => console.log(err));
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
						
    // Once agent is connected fires an action 
    if(agentParticipant.state == 'connected' && 
            customerParticipant.state == 'connected' && 
            !isExisting){
        // Add conversationid to existing conversations array
        console.log ('Event Connected --> fired up');
		window.open('https://www.google.com', '_blank');
		return registerConversation(conversation.id);
		console.log ('Conversation registered in the active conversation map!');
    }

    // If chat has ended remove the chat conversation - fires an action
    if(agentParticipant.state == 'disconnected' && isExisting){
		console.log ('Event Disconnected --> fired up');
		window.open('https://www.google.com', '_blank');
		chatConversations = chatConversations.filter(c => c.id != conversationId);
        }
    }
import assistService from './agent-assistant-service.js';
/**
 * This script is focused on the HTML / displaying of data to the page
 */

/**
 * Gets the chat Transcript
 *
 * @returns {HTMLElement}
 */
function Transcript() {
    let transcripts = document.getElementsByClassName("chatTranscript")
  
    if (transcripts.length > 0) {
      return transcripts[0]
    }
    return CreateElement("div", "cx-transcript") // We should never be there as there is always a transcript
}

 function updateScroll() {
    console.log('updateScroll()', document.getElementById("chatTranscript").scrollTop);
    document.getElementById("chatTranscript").scrollTop = 999;
}

export default {
    /**
     * Show the active chat conversations on the page
     * @param {Object} chat conversations
     * @param {Function} onTabClick function when a tab is clicked
     */
    populateActiveChatList(chat, onTabClick){
            let conversationId = chat.id;
            let participant = chat.participants.filter(
                    participant => participant.purpose === "customer")[0];
            let name = participant.name;
    
            // Show the list as options in the tab
            this.addCustomerList(name, conversationId, onTabClick);
    },

    /**
     * Show the entire transcript of a chat conversation
     * @param {Array} messagesArr array of Genesys Cloud messages
     * @param {Object} conversation Genesys Cloud convresation
     */
    displayTranscript(messagesArr, conversation){
        console.log('displayTranscript()');
        this.clearActiveChat();
        console.log(conversation);
        let conversationId = conversation.id;

        // Show each message
        messagesArr.forEach((msg) => {
            if(msg.hasOwnProperty("body")) {
                let message = msg.body;

                // Determine the name by cross referencing sender id 
                // with the participant.chats.id from the conversation parameter
                let senderId = msg.sender.id;
                let name = conversation
                            .participants.find(p => p.chats[0].id == senderId)
                            .name;
                let purpose = conversation
                            .participants.find(p => p.chats[0].id == senderId)
                            .purpose;
                            
                this.addChatMessage(name, message, conversationId, purpose);
            }
        });

    },

    /**
     * Clears all the chat mesages from the page
     */
    clearActiveChat(){
        const tabContents = document.getElementById("tabcontents");
        while (tabContents.firstChild) {
            tabContents.removeChild(tabContents.firstChild);
        }
    },

    /**
     * Add a new chat message to the page.
     * @param {String} sender sender name to be displayed
     * @param {String} message chat message to be displayed
     * @param {String} conversationId Genesys Cloud conversationid
     */
    addChatMessage(sender, message, conversationId, purpose){
        console.log('addChatMessage: ', purpose);        
        let tabEl = document.getElementById('tab-' + conversationId);

        // Only display the chat message if it's on the
        // currently shown conversation in the page.
        if(tabEl.classList.contains('is-active')){
            var chatMsg = document.createElement("p");

            if (purpose === 'workflow') {
                chatMsg.textContent = "Workflow: " + message;
            } else if (purpose === 'agent') {

                assistService.translateTextFromCustomer(message, function(translation){
                    console.log('##: getTranslation response: ', translation);
                    chatMsg.textContent = sender + ": " + translation;       
                });

            } else if (purpose === 'customer') {

                assistService.translateTextFromCustomer(message, function(translation){
                    console.log('##: getTranslation response: ', translation);
                    chatMsg.textContent = sender + ": " + translation;       
                });

            }
    
            var container = document.createElement("div");
            container.appendChild(chatMsg);
            container.className = "chat-message " + purpose;
    
            document.getElementById("tabcontents").appendChild(container);
        }

        Transcript().scrollTop = 99999999;
    },

    /**
     * Add a new entry(tab) to the customers list
     * @param {String} name Name of the chat customer
     * @param {String} conversationId Genesys Cloud converstaionId
     * @param {Function} onClickFunc Function for when the tab is clicked
     */
    addCustomerList(name, conversationId, onClickFunc){
        var elementExists = document.getElementById(conversationId);
    
        if (elementExists === null) {
            var link = document.createElement("a");
            link.innerHTML = name;
    
            var custSpan = document.createElement("span");
            custSpan.appendChild(link);
    
            var list = document.createElement("li");
            list.appendChild(custSpan);
            list.className = "customer-link";
            list.id = 'tab-' + conversationId;
            list.style.display = "block";

            // Call the callback function for clicking the tab
            list.addEventListener('click', function(event){
                onClickFunc(conversationId);
            });

            // Make the tab active
            list.addEventListener('click', function(event){
                var i, tabcontent, tablinks;
                tabcontent = document.getElementsByClassName("tabcontent");

                for (i = 0; i < tabcontent.length; i++) {
                    tabcontent[i].style.display = "none";
                }

                tablinks = document.getElementsByClassName("customer-link");

                for (i = 0; i < tablinks.length; i++) {
                    tablinks[i].className = tablinks[i].className.replace(" active is-active", "");
                }

                event.currentTarget.className += " active is-active";
            })
            document.getElementById("customersList").appendChild(list);
        }    
    },

    /**
     * Make tab active if agent switches to this customer in Genesys Cloud
     * @param {String} conversationId Genesys Cloud converstaionId
     */
    makeTabActive(conversationId){
        var i, tabcontent, tablinks;
        tabcontent = document.getElementsByClassName("tabcontent");

        for (i = 0; i < tabcontent.length; i++) {
            tabcontent[i].style.display = "none";
        }

        tablinks = document.getElementsByClassName("customer-link");

        for (i = 0; i < tablinks.length; i++) {
            tablinks[i].className = tablinks[i].className.replace(" active is-active", "");
        }

        let tab = document.getElementById('tab-' + conversationId);
        tab.className = "customer-link active is-active";
    },

    /**
     * Remove the tab from the list of conversations
     * @param {String} conversationId 
     */
    removeTab(conversationId){
        let id = 'tab-' + conversationId;
        let tab = document.getElementById(id);
        if(tab){
            if(tab.classList.contains('active')) this.clearActiveChat();
            tab.remove();
        }
    },

    /**
     * Agent assistant to clear recommended responses
     * @param {String} message
     * @param {String} conversationId
     * @param {String} communicationId
     */
    clearRecommendations(){
        const suggContents = document.getElementById("agent-assist");
        while (suggContents.firstChild) {
            suggContents.removeChild(suggContents.firstChild);
        }
    },

    
    /**
     * Agent assistant to show recommended response
     * @param {Array} suggArr
     * @param {String} conversationId
     * @param {String} communicationId
     * @param {Function} onClickCb Callback function when a recommendation is clicked
     */
    showRecommendations(suggArr, conversationId, communicationId, onClickCb){    
        // Clears all the recommended mesages from the page
        this.clearRecommendations();

        // Display recommended replies in HTML
        for (var i = 0; i < suggArr.length; i++) {
            var suggest = document.createElement('a');
            suggest.innerHTML = suggArr[i];
            suggest.addEventListener('click', function(event) {
                onClickCb(this.innerText, conversationId, communicationId);
            });

            var suggestContainer = document.createElement('div');
            suggestContainer.appendChild(suggest);
            suggestContainer.className = 'suggest-container';
            document.getElementById('agent-assist').appendChild(suggestContainer);
        }    
    }
}
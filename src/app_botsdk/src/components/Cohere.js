'use strict';

// Documentation for writing LLM Transformation handlers: https://github.com/oracle/bots-node-sdk/blob/master/LLM_TRANSFORMATION_HANDLER.md

// You can use your favorite http client package to make REST calls, however, the node fetch API is pre-installed with the bots-node-sdk.
// Documentation can be found at https://www.npmjs.com/package/node-fetch
// Un-comment the next line if you want to make REST calls using node-fetch.
// const fetch = require("node-fetch");

module.exports = {
  metadata: {
    name: 'Cohere',
    eventHandlerType: 'LlmTransformation'
  },
handlers: {

    /**
    * Handler to transform the request payload
    * @param {TransformPayloadEvent} event - event object contains the following properties:
    * - payload: the request payload object
    * @param {LlmTransformationContext} context - see https://oracle.github.io/bots-node-sdk/LlmTransformationContext.html
    * @returns {object} the transformed request payload
    */
    transformRequestPayload: async (event, context) => {
      // Cohere doesn't support chat completions, so we first print the system prompt, and if there
      // are additional chat entries, we add these to the system prompt under the heading CONVERSATION HISTORY
      let prompt = event.payload.messages[0].content;
      let streamResVar = event.payload.streamResponse;
      if (event.payload.messages.length > 1) {
        let history = event.payload.messages.slice(1).reduce((acc, cur) => `${acc}\n${cur.role}: ${cur.content}`, '');
        prompt += `\n\nCONVERSATION HISTORY:${history}\nassistant:`
      }
    
      return {
        "compartmentId": event.compartmentId,
        "servingMode": {
            "modelId": "cohere.command-a-03-2025",
            "servingType": "ON_DEMAND"
        },
        "chatRequest": {
            "maxTokens": 4000,
            "temperature": 0,
            "preambleOverride": null,
            "frequencyPenalty": 0,
            "presencePenalty": 0,
            "frequencyPenalty": 0,
            "topP": 0.75,
            "topK": 0,
            "isStream": streamResVar,
            "message": prompt, 
            "apiFormat": "COHERE"
        }
      }      
    },

    /**
    * Handler to transform the response payload
    * @param {TransformPayloadEvent} event - event object contains the following properties:
    * - payload: the response payload object
    * @param {LlmTransformationContext} context - see https://oracle.github.io/bots-node-sdk/LlmTransformationContext.html
    * @returns {object} the transformed response payload
    */
    transformResponsePayload: async (event, context) => {
      // console.log("<transformResponsePayload>")
      // console.log( JSON.stringify(event) )

      let llmPayload = {};
      if (event.payload.responseItems) {
        // streaming case
        llmPayload.responseItems = [];
        //let contentVar = event.payload.responseItems;
        event.payload.responseItems.forEach(item => {     
          // only grab the text items, since last item in the responseItems[] is the finished reason not part of the sentence 
          
          let finishReasonVar = item.finishReason;
          console.log( "finishReasonVar="+finishReasonVar )
          if (finishReasonVar != 'COMPLETE') {
              console.log( "---- ITEM -----" )
              console.log( JSON.stringify(item) )
              let text = item.text;
              if (text !== "") {
                 // check for only the stream items and not the 'complete' message (e.g. the last message returned by the API)
                llmPayload.responseItems.push({ "candidates": [{ "content" : text || "" }] });
              }         
          }         
        });
      } else {
        llmPayload.candidates = [{ "content" :  event.payload.chatResponse.text }];  
      }
      console.log( JSON.stringify(llmPayload) )
      return llmPayload;
    },

/*
               let msgcontent = item.message.content[0];
              let text = msgcontent.text;
              if (text !== "") {
                 // check for only the stream items and not the 'complete' message (e.g. the last message returned by the API)
                llmPayload.responseItems.push({ "candidates": [{ "content" : text || "" }] });
              }         
          }         
        });
      } else {
        //let c = event.payload.chatResponse.choices;
        event.payload.chatResponse.choices.forEach(item => {
          let msgcontent = item.message.content[0];
          let text = msgcontent.text;
          llmPayload.candidates = [{ "content" : text || "" }];
         });
      }
    },
*/

    /**
    * Handler to transform the error response payload, invoked when HTTP status code is 400 or higher and the error
    * response body received is a JSON object
    * @param {TransformPayloadEvent} event - event object contains the following properties:
    * - payload: the error response payload object
    * @param {LlmTransformationContext} context - see https://oracle.github.io/bots-node-sdk/LlmTransformationContext.html
    * @returns {object} the transformed error response payload
    */
    transformErrorResponsePayload: async (event, context) => {
      const error = event.payload.message || 'unknown error';
      if (error.startsWith('invalid request: total number of tokens')) {
        // returning modelLengthExceeded error code will cause a retry with reduced chat history
        return { "errorCode": "modelLengthExceeded", "errorMessage": error };
      } else {
        return { "errorCode": "unknown", "errorMessage": error };
      }
    }

  }
};
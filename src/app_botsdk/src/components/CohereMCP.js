'use strict';
// Documentation for writing LLM Transformation handlers: https://github.com/oracle/bots-node-sdk/blob/master/LLM_TRANSFORMATION_HANDLER.md

// You can use your favorite http client package to make REST calls, however, the node fetch API is pre-installed with the bots-node-sdk.
// Documentation can be found at https://www.npmjs.com/package/node-fetch
// Un-comment the next line if you want to make REST calls using node-fetch.
// const fetch = require("node-fetch");

const MCPClient = require('../mcp/oci_mcp_client_lib.js');

module.exports = {
    metadata: {
        name: 'CohereMCP',
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
            console.log("<transformRequestPayload>");
            console.log("event: " + JSON.stringify(event));
            console.log("context: " + JSON.stringify(context));

            let prompt = event.payload.messages[0].content;
            let streamResVar = event.payload.streamResponse;
            if (event.payload.messages.length > 1) {
                let history = event.payload.messages.slice(1).reduce((acc, cur) => `${acc}\n${cur.role}: ${cur.content}`, '');
                prompt += `\n\nCONVERSATION HISTORY:${history}\nassistant:`
            }

            var requestPayload = {
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
            };

            // Transform the list of tools in Cohere Tools Format 
            if ( event.payload.functions ) {
                var tools = []; 
                var mcpClient = new MCPClient();    
                console.log("event.payload.functions: " + JSON.stringify(event.payload.functions));
                // Check if there are function define and transform the list in Cohere Tools Format
                for (var i = 0; i < event.payload.functions.length; i++) {
                    var f = event.payload.functions[i];
                    if( f.name=='mcp' ) {
                        console.log("before connectToServer");                    
                        await mcpClient.connectToServer(f.description);
                        console.log("after connectToServer");
                        await mcpClient.listTools();
                        console.log("after listTools");
                        requestPayload.chatRequest["mcp"] = f.description;
                    } else {
                        mcpClient.addOdaTool2Cohere( f );
                        console.log("after addOdaTool2Cohere");
                    }
                }
                requestPayload.chatRequest["tools"] = mcpClient.toolsCohere;
                await mcpClient.cleanup();               
            }
            console.log("requestPayload: " + JSON.stringify(requestPayload));

            return requestPayload;
        },

        /**
        * Handler to transform the response payload
        * @param {TransformPayloadEvent} event - event object contains the following properties:
        * - payload: the response payload object
        * @param {LlmTransformationContext} context - see https://oracle.github.io/bots-node-sdk/LlmTransformationContext.html
        * @returns {object} the transformed response payload
        */
        transformResponsePayload: async (event, context) => {
            console.log("<transformResponsePayload>");
            console.log("event: " + JSON.stringify(event));
            console.log("context: " + JSON.stringify(context));

            let llmPayload = {};
            if (event.payload.responseItems) {
                console.log( "---- responseItems" )
                // streaming case
                llmPayload.responseItems = [];
                //let contentVar = event.payload.responseItems;
                event.payload.responseItems.forEach(item => {
                    // only grab the text items, since last item in the responseItems[] is the finished reason not part of the sentence 

                    let finishReasonVar = item.finishReason;
                    console.log("finishReasonVar=" + finishReasonVar)
                    if (finishReasonVar != 'COMPLETE') {
                        // console.log( "---- ITEM -----" )
                        // console.log( JSON.stringify(item) )
                        let text = item.text;
                        if (text !== "") {
                            // check for only the stream items and not the 'complete' message (e.g. the last message returned by the API)
                            llmPayload.responseItems.push({ "candidates": [{ "content": text || "" }] });
                        }
                    }
                });
            } else {
                console.log( "---- NO responseItems" );
                llmPayload.candidates = [{ "content": event.payload.chatResponse.text }];
                if ( event.payload.chatResponse.toolCalls ) {
                    var t = event.payload.chatResponse.toolCalls[0];
                    if ( t.name.startsWith("local_") ) {
                        t.name = t.name.replace( "local_", "" );
                        llmPayload.candidates = [{ "content":  JSON.stringify(t) }];
                    } else {
                        llmPayload.candidates = [{ "content":  JSON.stringify(t) }];
                    }
                }
            }
            console.log("llmPayload: " + JSON.stringify(llmPayload))
            return llmPayload;
        },

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
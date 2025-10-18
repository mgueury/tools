'use strict';

// Documentation for writing LLM Transformation handlers: https://github.com/oracle/bots-node-sdk/blob/master/LLM_TRANSFORMATION_HANDLER.md

// You can use your favorite http client package to make REST calls, however, the node fetch API is pre-installed with the bots-node-sdk.
// Documentation can be found at https://www.npmjs.com/package/node-fetch
// Un-comment the next line if you want to make REST calls using node-fetch.
// const fetch = require("node-fetch");

const mcp_client = require("@modelcontextprotocol/sdk/client/index.js");
const stdio = require("@modelcontextprotocol/sdk/client/stdio.js");
const streamableHttp = require("@modelcontextprotocol/sdk/client/streamableHttp.js");
const readline = require("readline/promises");


function debug(s) {
  console.log(s);
}

class MCPClient {
  constructor() {
    this.mcp = new mcp_client.Client({ name: "mcp-client-cli", version: "1.0.0" });
    this.llm = null;
    this.transport = null;
    this.tools = [];
  }

  async connectToServer(serverPath) {
    try {   
      if (serverPath.startsWith('http')) {
        debug("streamableHTTP");
        const url = new URL(serverPath);
        this.transport = new streamableHTTP.StreamableHTTPClientTransport(url);
        await this.mcp.connect(this.transport);
      } else {
        debug("stdio");
        const isJs = serverPath.endsWith(".js");
        const isPy = serverPath.endsWith(".py");
        if (!isJs && !isPy) {
          throw new Error("Server script must be a .js or .py file");
        }
        const command = isPy
          ? process.platform === "win32"
            ? "python"
            : "python3.12"
          : process.execPath;

        this.transport = new stdio.StdioClientTransport({
          command,
          args: [serverPath],
        });
        await this.mcp.connect(this.transport);
      }
      debug("before ListTools");
      await new Promise(r => setTimeout(r, 2000));

      const toolsResult = await this.mcp.listTools();

      debug("toolsResult " + JSON.stringify(toolsResult));
      this.tools = toolsResult.tools.map((tool) => {
        debug("tool.inputSchema: " + JSON.stringify(tool.inputSchema));
        var tool_schema = tool.inputSchema.properties;
        debug("tool_schema: " + JSON.stringify(tool_schema));
        var params = {}
        Object.keys(tool_schema).forEach(function(key, index) {
          params[key] = {
            type: tool_schema[key].type,
            description: tool_schema[key].name,
            isRequired: false
          }
        });
        debug("tool.inputSchema " + JSON.stringify(params));
        return {
          name: tool.name,
          description: tool.description,
          parameterDefinitions: params,
        };
      });
      debug("this.tools: " + JSON.stringify(this.tools));
      console.log(
        "Connected to server with tools:",
        this.tools.map(({ name }) => name),
      );
    } catch (e) {
      console.log("Failed to connect to MCP server: ", e);
      throw e;
    }
    await this.mcp.close();
  }

  async cleanup() {
    await this.mcp.close();
  }
}

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
      let prompt = event.payload.messages[0].content;
      let streamResVar = event.payload.streamResponse;
      if (event.payload.messages.length > 1) {
        let history = event.payload.messages.slice(1).reduce((acc, cur) => `${acc}\n${cur.role}: ${cur.content}`, '');
        prompt += `\n\nCONVERSATION HISTORY:${history}\nassistant:`
      }

      console.log( JSON.stringify(item) )
      const mcpClient = new MCPClient();
      try {
        await mcpClient.initLLM();
        await mcpClient.connectToServer("/home/opc/oci-mcp-quickstart/python-fastmcp/mcp_add.py");
        await mcpClient.chatLoop();
      } finally {
        await mcpClient.cleanup();
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
            "apiFormat": "COHERE",
            "tools": mcpClient.tools,
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
              // console.log( "---- ITEM -----" )
              // console.log( JSON.stringify(item) )
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

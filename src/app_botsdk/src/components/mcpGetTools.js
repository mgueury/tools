'use strict';

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
  metadata: () => ({
    name: 'mcpGetTools',
    properties: {
      mcpPath: { required: true, type: 'string' },
      outputVariableName: {required: true, type: 'string'},      
    },
    supportedActions: []
  }),

  invoke: async (conversation, done) => {
    var logger = conversation.logger();
    // perform conversation tasks.
    const { mcpPath } = conversation.properties();
    const { outputVariableName } = conversation.properties();

    try {
      await mcpClient.initLLM();
      // await mcpClient.connectToServer("/home/opc/oci-mcp-quickstart/python-fastmcp/mcp_add.py");
      await mcpClient.connectToServer(mcpPath);
      conversation.variable(outputVariableName, result);
      conversation.transition('success');    
    } catch(err) {
      debug( err.message );
      conversation.transition('failure');
    } finally {
      await mcpClient.cleanup();

    }

    // perform conversation tasks.
    const { human } = conversation.properties();
    conversation
      .reply(`Read tools of ${mcpPath}`)
      .transition(); 
    done();
  }
};

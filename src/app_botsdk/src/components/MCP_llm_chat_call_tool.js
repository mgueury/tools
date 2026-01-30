'use strict';
const MCPClient = require('../mcp/oci_mcp_client_lib.js');

module.exports = {
    metadata: () => ({
        name: 'MCP_llm_chat_call_tool',
        properties: {
            prompt: { required: true, type: 'string' },
            toolsMCP: { required: true, type: 'string' },
            toolsLocal: { required: false, type: 'string' },
            config: { required: true, type: 'string' }
        },
        supportedActions: []
    }),

    invoke: async (conversation, done) => {
        var logger = conversation.logger();
        // perform conversation tasks.
        const { prompt } = conversation.properties();
        const { toolsMCP } = conversation.properties();
        const { toolsLocal } = conversation.properties();
        const { config } = conversation.properties();
        let jConfig = JSON.parse(config);

        const mcpClient = new MCPClient(jConfig);
        try {
            // await mcpClient.connectToServer("/home/opc/oci-mcp-quickstart/python-fastmcp/mcp_add.py");
            mcpClient.config = jConfig
            await mcpClient.initLLM();
            await mcpClient.connectToServer(jConfig.mcpPath);
            mcpClient.toolsMCP = { "tools": JSON.parse(toolsMCP) };
            if (toolsLocal) {
                console.log("toolsLocal: " + toolsLocal);
                mcpClient.addToolsLocal2ToolsMCP(JSON.parse(toolsLocal));
            }
            const [res_type, result] = await mcpClient.LlmChatCallTool(prompt);
            conversation.variable(jConfig.outputVariableName, result);
            conversation.transition(res_type);
        } catch (err) {
            console.log("Exception: " + err.stack);
            console.log(err.message);
            conversation.transition('failure');
        } finally {
            await mcpClient.cleanup();
        }
        done();
    }
};

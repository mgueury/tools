'use strict';
const MCPClient = require('../mcp/oci_mcp_client_lib.js');

module.exports = {
    metadata: () => ({
        name: 'MCP_call_tool',
        properties: {
            tool: { required: true, type: 'string' },
            config: { required: true, type: 'string' }
        },
        supportedActions: []
    }),

    invoke: async (conversation, done) => {
        var logger = conversation.logger();
        // perform conversation tasks.
        const { tool } = conversation.properties();
        const { config } = conversation.properties();
        const mcpClient = new MCPClient();
        try {
            let jConfig = JSON.parse(config);
            // await mcpClient.connectToServer("/home/opc/oci-mcp-quickstart/python-fastmcp/mcp_add.py");
            await mcpClient.initLLM();
            await mcpClient.connectToServer(jConfig.mcpPath);
            const result = await mcpClient.callTool( JSON.parse(tool) );
            conversation.variable(jConfig.outputVariableName, result);
            conversation.transition('success');
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

'use strict';
const MCPClient = require('../mcp/oci_mcp_client_lib.js');

module.exports = {
    metadata: () => ({
        name: 'MCP_call_tool',
        properties: {
            prompt: { required: true, type: 'string' },
            toolsMCP: { required: true, type: 'string' },
            toolsLocal: { required: false, type: 'string' },
            mcpPath: { required: true, type: 'string' },
            outputVariableName: { required: true, type: 'string' },
        },
        supportedActions: []
    }),

    invoke: async (conversation, done) => {
        var logger = conversation.logger();
        // perform conversation tasks.
        const { prompt } = conversation.properties();
        const { toolsMCP } = conversation.properties();
        const { toolsLocal } = conversation.properties();
        const { mcpPath } = conversation.properties();
        const { outputVariableName } = conversation.properties();

        try {
            const mcpClient = new MCPClient();
            // await mcpClient.connectToServer("/home/opc/oci-mcp-quickstart/python-fastmcp/mcp_add.py");
            await mcpClient.connectToServer(mcpPath);
            mcpClient.toolsMCP = toolsMCP;
            if( toolsLocal ) {
               mcpClient.addToolsLocal( toolsLocal )
            }
            [ res_type, result ] = await this.processQuery(prompt);
            conversation.variable(outputVariableName, result);
            conversation.transition(res_type);
        } catch (err) {
            debug(err.message);
            conversation.transition('failure');
        } finally {
            await mcpClient.cleanup();
        }
        done();
    }
};

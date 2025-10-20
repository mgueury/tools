'use strict';
const MCPClient = require('./mcp/oci_mcp_client_lib.js');

module.exports = {
  metadata: () => ({
    name: 'mcpCallTool',
    properties: {
      tool: { required: true, type: 'object' },
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
      const mcpClient = new MCPClient();
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

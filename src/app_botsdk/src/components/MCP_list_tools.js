'use strict';
const MCPClient = require('../mcp/oci_mcp_client_lib.js');

module.exports = {
  metadata: () => ({
    name: 'MCP_list_tools',
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
    console.log( "-- MCP_list_tools --------------------------------------" );
    console.log( "mcpPath="+mcpPath );
    console.log( "outputVariableName="+outputVariableName );
    const mcpClient = new MCPClient();    
    try {
      // await mcpClient.connectToServer("/home/opc/oci-mcp-quickstart/python-fastmcp/mcp_add.py");
      await mcpClient.connectToServer(mcpPath);
      await mcpClient.listTools();
      conversation.variable(outputVariableName, mcpClient.toolsMCP.tools);
      conversation.transition('success');    
      console.log( "tools="+ JSON.stringify(mcpClient.toolsMCP.tools));
    } catch(err) {
      console.log( "Exception: " + err.stack );      
      console.log( err.message );
      conversation.transition('failure');
    } finally {
      await mcpClient.cleanup();
    }
    done();
  }
};

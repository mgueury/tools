const oci_genai = require("oci-generativeaiinference");
const oci_common = require("oci-common");
const mcp_client = require("@modelcontextprotocol/sdk/client/index.js");
const stdio = require("@modelcontextprotocol/sdk/client/stdio.js");
const streamableHttp = require("@modelcontextprotocol/sdk/client/streamableHttp.js");
const readline = require("readline/promises");

const servingMode = {
    modelId: process.env.TF_VAR_genai_cohere_model,
    servingType: "ON_DEMAND",
};

class MCPClient {
    constructor() {
        this.mcp = new mcp_client.Client({ name: "mcp-client-cli", version: "1.0.0" });
        this.llm = null;
        this.transport = null;
        this.toolsCohere = [];
        this.toolsMCP = null;
    }

    debug(s) {
        console.log(s);
    }

    async initLLM() {
        const provider = await new oci_common.InstancePrincipalsAuthenticationDetailsProviderBuilder().build();
        this.llm = new oci_genai.GenerativeAiInferenceClient({
            authenticationDetailsProvider: provider,
        });
        this.llm.endpoint = "https://inference.generativeai." + process.env.TF_VAR_region + ".oci.oraclecloud.com";
    }

    async connectToServer(serverPath) {
        if (serverPath.startsWith('http')) {
            this.debug("streamableHTTP");
            const url = new URL(serverPath);
            this.transport = new streamableHTTP.StreamableHTTPClientTransport(url);
            await this.mcp.connect(this.transport);
        } else {
            this.debug("stdio");
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
        this.debug("before ListTools");
        await new Promise(r => setTimeout(r, 2000));
    }

    addToolsLocal( toolsLocal ) {
        toolsLocal.tools.map((tool) => {
            tool.name = "local_" + tool.name;
            this.toolsMCP.push( tool );
        });
        this.debug("this.toolsMCP: " + JSON.stringify(this.toolsMCP));
        this.getToolsCohere();
    }

    getToolsCohere() {
        this.toolsCohere = this.toolsMCP.tools.map((tool) => {
            this.debug("tool.inputSchema: " + JSON.stringify(tool.inputSchema));
            var tool_schema = tool.inputSchema.properties;
            this.debug("tool_schema: " + JSON.stringify(tool_schema));
            var params = {}
            Object.keys(tool_schema).forEach(function (key, index) {
                params[key] = {
                    type: tool_schema[key].type,
                    description: tool_schema[key].name,
                    isRequired: false
                }
            });
            // Required
            this.debug("tool.inputSchema.required: " + JSON.stringify(tool.inputSchema.required));
            tool.inputSchema.required.forEach( function (key, index) {
                params[key].isRequired = true;
            });
            this.debug("params: " + JSON.stringify(params));
            return {
                name: tool.name,
                description: tool.description,
                parameterDefinitions: params,
            };
        });
        this.debug("this.toolsCohere: " + JSON.stringify(this.toolsCohere));
        console.log(
            "Connected to server with tools:",
            this.toolsCohere.map(({ name }) => name),
        );
    }

    async getToolsMCP() {
        this.toolsMCP = await this.mcp.listTools();
        this.debug("this.toolsMCP " + JSON.stringify(this.toolsMCP));
        this.getToolsCohere();
    }

    async callTool(tool) {
        const result = await this.mcp.callTool({
            name: tool.name,
            arguments: tool.parameters,
        });
        this.debug("result: " + JSON.stringify(result));
        return result;
    }

    async processQuery(query) {
        const chatRequest = {
            chatDetails: {
                compartmentId: process.env.TF_VAR_compartment_ocid,
                servingMode: servingMode,
                chatRequest: {
                    message: query,
                    apiFormat: "COHERE",
                    maxTokens: 2000,
                    temperature: 0,
                    tools: this.toolsCohere,
                }
            },
            retryConfiguration: oci_common.NoRetryConfigurationDetails
        };
        this.debug("chatRequest: " + JSON.stringify(chatRequest));
        const response = await this.llm.chat(chatRequest);
        const chatResponse = response.chatResult.chatResponse;
        const messages = [
            {
                role: "user",
                content: query,
            },
        ];
        this.debug("chatResponse: " + JSON.stringify(chatResponse));

        const finalText = [];

        finalText.push(chatResponse.text);

        if (chatResponse.toolCalls) {
            for (const toolCall of chatResponse.toolCalls) {
                this.debug(toolCall);
                if( toolCall.name.startsWith("local_") ) {
                    return [ "local", JSON.stringify(toolCall) ];
                } 
                finalText.push(
                    `[Calling tool ${toolCall.name} with args ${JSON.stringify(toolCall.parameters)}]`,
                );
                const result = await this.callTool( toolCall );
                finalText.push(`[Calling tool done]`);
                finalText.push(result.content[0].text);
                this.debug("result: " + result.content[0].text);

                messages.push({
                    role: "user",
                    content: result.content[0].text,
                });
            }
        }
        return [ "mcp", finalText.join("\n") ];
    }

    async chatLoop() {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });

        try {
            console.log("\nMCP Client Started!");
            console.log("Type your queries or 'quit' to exit.");

            while (true) {
                const message = await rl.question("\nQuery: ");
                if (message.toLowerCase() === "quit") {
                    break;
                }
                console.log("\n" + message);
                const [res_type, response] = await this.processQuery(message);
                console.log("\n" + response);
            }
        } catch (e) {
            console.log("Error: ", e);
            console.log(e.stack);
        } finally {
            rl.close();
        }
    }

    async cleanup() {
        await this.mcp.close();
    }

    async main() {
        if (process.argv.length < 3) {
            console.log("Usage: node build/index.js <path_to_server_script>");
            return;
        }
        try {
            await this.initLLM();
            await this.connectToServer(process.argv[2]);
            await this.getToolsMCP();
            await this.chatLoop();
        } catch( e ) {
            console.log( "Exception: " + e );
            console.log( e.stack );
        } finally {
            await this.cleanup();
            process.exit(0);
        }
    }
}

module.exports = MCPClient;
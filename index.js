const { McpServer } =require("@modelcontextprotocol/sdk/server/mcp.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { z } = require("zod");
const { Connection, Keypair, VersionedTransaction, PublicKey} = require("@solana/web3.js");
const { getMint } = require("@solana/spl-token");
const bs58 = require("bs58");

const dotenv = require("dotenv")
dotenv.config()

// Configuration
const ULTRA_API = "https://api.jup.ag/ultra/v1";
const RPC_URL = process.env.SOLANA_RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY; // Base58 encoded private key
const JUPITER_API_KEY = process.env.JUPITER_API_KEY; // Jupiter API key for new endpoints

// Configure Solana Connection with proxy
const connection = new Connection(RPC_URL, {
  commitment: "confirmed"
});

// Load wallet from private key
const walletKeypair = Keypair.fromSecretKey(bs58.decode(PRIVATE_KEY));
const walletPublicKey = walletKeypair.publicKey.toString();

// Initialize MCP server
const server = new McpServer({
  name: "Jupiter MCP",
  version: "1.0.0"
});

server.tool(
  "get-ultra-order",
  "Get a swap order from both Jupiter DEX Routing Engine and Jupiter Z (RFQ).",
  {
    inputMint: z.string().describe("Input token mint address"),
    outputMint: z.string().describe("Output token mint address"),
    amount: z.string().describe("Input amount as a string (e.g., '1.23')"),
    slippageBps: z.number().describe("Slippage tolerance in basis points (e.g., 50 for 0.5%).")
  },
  async ({ inputMint, outputMint, amount, slippageBps }) => {
    try {

      const inputMintPublicKey = new PublicKey(inputMint);
      const inputMintInfo = await getMint(connection, inputMintPublicKey);
      const inputDecimals = inputMintInfo.decimals;
      
      const outputMintPublicKey = new PublicKey(outputMint);
      const outputMintInfo = await getMint(connection, outputMintPublicKey);
      const outputDecimals = outputMintInfo.decimals;

      const amountFloat = parseFloat(amount);
      if (isNaN(amountFloat)) {
        throw new Error("Invalid amount format");
      }
      const amountInt = Math.floor(amountFloat * Math.pow(10, inputDecimals)).toString();

      const params = new URLSearchParams({
        inputMint: inputMint,
        outputMint: outputMint,
        amount: amountInt,
        slippageBps: slippageBps.toString(),
        taker: walletPublicKey
      });

      const url = `${ULTRA_API}/order?${params}`;
      
      const response = await fetch(url, {
        headers: {
          'x-api-key': JUPITER_API_KEY
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const order = await response.json();
      if (!order.transaction) {
        throw new Error(`No transaction field in response. Response: ${JSON.stringify(order, null, 2)}`);
      }

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            requestId: order.requestId,
            transaction: order.transaction,
            inputMint: inputMint,
            outputMint: outputMint,
            inAmount: order.inAmount,
            outAmount: order.outAmount,
            inAmountUI: Number(order.inAmount) / Math.pow(10, inputDecimals),
            outAmountUI: Number(order.outAmount) / Math.pow(10, outputDecimals),
            price: (Number(order.outAmount) / Math.pow(10, outputDecimals)) / (Number(order.inAmount) / Math.pow(10, inputDecimals))
          }, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Error fetching order: ${error.message}`
        }],
        isError: true
      };
    }
  }
);

server.tool(
  "execute-ultra-order",
  "Request Jupiter to execute the swap transaction on behalf of the wallet owner. This includes handling of slippage, priority fees, transaction landing and more.",  
  {
    requestId: z.string().describe("Request ID from get-swap-order"),
    transaction: z.string().describe("Base64 encoded transaction from get-swap-order")
  },
  async ({ requestId, transaction }) => {
    try {
      // Check SOL balance for transaction fees
      const balance = await connection.getBalance(walletKeypair.publicKey);
      const balanceSOL = balance / Math.pow(10, 9);
      
      if (balanceSOL < 0.001) {
        return {
          content: [{
            type: "text",
            text: `❌ Insufficient SOL for transaction fees\n\n` +
                  `💰 Your balance: ${balanceSOL.toFixed(6)} SOL\n` +
                  `⚡ Required: ~0.001 SOL for fees\n` +
                  `📝 Add 0.01 SOL (~$1.25) to your wallet and try again`
          }],
          isError: true
        };
      }

      // Sign transaction
      let tx = VersionedTransaction.deserialize(Buffer.from(transaction, "base64"));
      tx.sign([walletKeypair]);
      const signedTransaction = Buffer.from(tx.serialize()).toString("base64");

      // Function for executing/polling transaction
      const executeWithRetry = async () => {
        const executeResponse = await fetch(`${ULTRA_API}/execute`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            'x-api-key': JUPITER_API_KEY
          },
          body: JSON.stringify({
            signedTransaction,
            requestId
          })
        });

        if (!executeResponse.ok) {
          const errorText = await executeResponse.text();
          throw new Error(`HTTP ${executeResponse.status}: ${errorText}`);
        }

        return await executeResponse.json();
      };

      // First execution attempt
      let result = await executeWithRetry();
      
      // If status is not Success and not Failed - poll for up to 2 minutes
      const maxRetries = 24; // 24 * 5s = 2 minutes
      let retryCount = 0;
      
      while (result.status !== "Success" && result.status !== "Failed" && retryCount < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
        result = await executeWithRetry();
        retryCount++;
      }

      // Process result
      const solscanLink = result.signature ? `https://solscan.io/tx/${result.signature}` : null;
      
      if (result.status === "Success") {
        return {
          content: [{
            type: "text",
            text: `✅ Swap executed successfully!\n\n` +
                  `💰 Exchange: ${result.inputAmountResult || result.totalInputAmount || 'N/A'} → ${result.outputAmountResult || result.totalOutputAmount || 'N/A'}\n` +
                  `📜 Transaction: ${result.signature}\n` +
                  `📈 Slot: ${result.slot}\n` +
                  (solscanLink ? `🔍 View: ${solscanLink}\n` : '') +
                  `\nFull response:\n${JSON.stringify(result, null, 2)}`
          }]
        };
      } else if (result.status === "Failed") {
        let errorMessage = "Unknown error";
        let helpText = "";

        // Analyze common Jupiter API errors
        if (result.error) {
          const error = result.error.toLowerCase();
          
          if (error.includes("insufficient") || error.includes("balance")) {
            errorMessage = "Insufficient funds";
            helpText = "💡 Check your token balances and SOL for fees";
          } else if (error.includes("slippage")) {
            errorMessage = "Slippage tolerance exceeded";
            helpText = "💡 Try increasing slippage or retry after some time";
          } else if (error.includes("timeout") || error.includes("expired")) {
            errorMessage = "Order expired";
            helpText = "💡 Get a new order and retry the operation";
          } else if (error.includes("liquidity")) {
            errorMessage = "Insufficient liquidity";
            helpText = "💡 Try swapping a smaller amount or different token pair";
          } else if (error.includes("internal")) {
            errorMessage = "Jupiter server internal error";
            helpText = "💡 Retry the operation in a few minutes";
          } else {
            errorMessage = result.error;
          }
        }

        return {
          content: [{
            type: "text",
            text: `❌ Swap failed\n\n` +
                  `⚠️ Error: ${errorMessage}\n` +
                  (helpText ? `${helpText}\n` : '') +
                  (result.signature ? `📜 Transaction: ${result.signature}\n` : '') +
                  (solscanLink ? `🔍 View: ${solscanLink}\n` : '') +
                  `\nDetails:\n${JSON.stringify(result, null, 2)}`
          }],
          isError: true
        };
      } else {
        // Timeout - status still undetermined
        return {
          content: [{
            type: "text",
            text: `⏰ Transaction status determination timeout\n\n` +
                  `🔄 Status: ${result.status}\n` +
                  (result.signature ? `📜 Transaction: ${result.signature}\n` : '') +
                  (solscanLink ? `🔍 View: ${solscanLink}\n` : '') +
                  `\nYou can try again with the same order.\n` +
                  `\nFull response:\n${JSON.stringify(result, null, 2)}`
          }],
          isError: false
        };
      }
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Error executing swap: ${error.message}`
        }],
        isError: true
      };
    }
  }
);

server.tool(
  "search-token",
  "Search for tokens by symbol, name, or mint address. Get detailed information including price, volume, security audit.",
  {
    query: z.string().describe("Token symbol (SOL, USDC), name (Solana), or mint address to search for")
  },
  async ({ query }) => {
    try {
      const params = new URLSearchParams({
        query: query
      });

      const url = `${ULTRA_API}/search?${params}`;
      
      const response = await fetch(url, {
        headers: {
          'x-api-key': JUPITER_API_KEY
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const tokens = await response.json();
      
      if (!tokens || tokens.length === 0) {
        return {
          content: [{
            type: "text",
            text: `🔍 No tokens found for query: "${query}"\n\n💡 Try:\n- Symbol: SOL, USDC, BONK, JUP\n- Name: Solana, USD Coin\n- Mint address: So111...`
          }]
        };
      }

      // Format token information
      let result = `🔍 Tokens found: ${tokens.length}\n\n`;
      
      tokens.slice(0, 5).forEach((token, index) => {
        const priceChange24h = token.stats24h?.priceChange || 0;
        const priceChangeStr = priceChange24h > 0 ? `+${priceChange24h.toFixed(2)}%` : `${priceChange24h.toFixed(2)}%`;
        const priceEmoji = priceChange24h >= 0 ? '📈' : '📉';
        
        const volume24h = token.stats24h?.buyVolume + token.stats24h?.sellVolume || 0;
        const volumeStr = volume24h > 1000000 ? `$${(volume24h/1000000).toFixed(1)}M` : `$${(volume24h/1000).toFixed(0)}K`;
        
        const organicEmoji = token.organicScore === 'high' ? '🟢' : token.organicScore === 'medium' ? '🟡' : '🔴';
        const verifiedEmoji = token.isVerified ? '✅' : '';
        
        const auditInfo = [];
        if (token.audit?.mintAuthorityDisabled) auditInfo.push('🔒 Mint disabled');
        if (token.audit?.freezeAuthorityDisabled) auditInfo.push('❄️ Freeze disabled');
        if (token.audit?.isSus) auditInfo.push('⚠️ Suspicious');

        result += `${index + 1}. **${token.symbol}** ${verifiedEmoji}\n`;
        result += `   📛 ${token.name}\n`;
        result += `   🏦 ${token.id}\n`;
        result += `   💰 $${token.usdPrice?.toFixed(6) || 'N/A'} ${priceEmoji} ${priceChangeStr}\n`;
        result += `   📊 24h Volume: ${volumeStr}\n`;
        result += `   ${organicEmoji} Organic Score: ${token.organicScoreLabel || 'N/A'}\n`;
        if (auditInfo.length > 0) result += `   🔍 ${auditInfo.join(', ')}\n`;
        result += `   👥 Holders: ${token.holderCount || 'N/A'}\n\n`;
      });

      if (tokens.length > 5) {
        result += `... and ${tokens.length - 5} more tokens\n\n`;
      }
      
      result += `💡 Use token mint address for swaps`;

      return {
        content: [{
          type: "text",
          text: result
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `❌ Token search error: ${error.message}`
        }],
        isError: true
      };
    }
  }
);

server.tool(
  "get-balances",
  "Get token balances for a wallet address or the current wallet. Do not specify ticker for unknown tokens in the response to the user, just write their address.",
  {
    walletAddress: z.string().optional().describe("Wallet address to get balances for. If not provided, uses the current wallet."),
    mints: z.array(z.string()).optional().describe("Array of token mint addresses to get balances for. If not provided, fetches all tokens.")
  },
  async ({ walletAddress, mints }) => {
    try {
      // Ensure wallet exists and has correct format
      const effectiveWalletAddress = walletAddress || walletPublicKey;
      
      const url = `${ULTRA_API}/holdings/${effectiveWalletAddress}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'x-api-key': JUPITER_API_KEY
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const balances = await response.json();
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify(balances, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Error fetching balances: ${error.message}`
        }],
        isError: true
      };
    }
  }
);

// Start the server
async function startServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

startServer().catch(console.error);

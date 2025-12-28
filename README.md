# Jupiter MCP Server

A comprehensive MCP (Model Context Protocol) server for interacting with Jupiter Protocol on Solana. Features token swaps, search, portfolio management, and intelligent error diagnostics.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node.js](https://img.shields.io/badge/Node.js-18.x-green.svg)
![Status](https://img.shields.io/badge/status-active-brightgreen.svg)
![Jupiter API](https://img.shields.io/badge/Jupiter-Ultra%20API-orange.svg)

## 🚀 Features

- **Token Swaps**: Execute swaps via Jupiter's Ultra API with intelligent slippage and fee handling
- **Token Search**: Find tokens by symbol, name, or mint address with detailed market data
- **Portfolio Management**: View token balances and holdings across your wallet
- **Smart Diagnostics**: Intelligent error detection with helpful user guidance
- **SOL Fee Checking**: Automatic validation of sufficient SOL for transaction fees
- **Multi-language Support**: Full English localization for international users


## 📋 Prerequisites

- **Node.js**: Version 18 or higher (for native `fetch` support)
- **Jupiter API Key**: Get your free API key at [Jupiter Portal](https://portal.jup.ag)
- **Solana Wallet**: A private key (base58-encoded) for signing transactions
- **RPC Endpoint**: Access to a Solana RPC node (e.g., `https://api.mainnet-beta.solana.com`)

## 📦 Installation

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/pipedude/jupiter-mcp.git
   cd jupiter-mcp
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Environment Setup**:
   Copy the example environment file and configure your settings:
   ```bash
   cp .env.example .env
   ```

4. **Configure Environment Variables**:
   Edit `.env` file with your credentials:
   ```env
   SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
   PRIVATE_KEY=your_base58_encoded_private_key_here
   JUPITER_API_KEY=your_jupiter_api_key_here
   ```

5. **Client Configuration**:
   Add to your MCP client configuration:
   ```json
   {
     "mcpServers": {
       "Jupiter-MCP": {
         "command": "node",
         "args": ["path/to/jupiter-mcp/index.js"],
         "env": {
           "SOLANA_RPC_URL": "https://api.mainnet-beta.solana.com",
           "PRIVATE_KEY": "your_base58_encoded_private_key_here",
           "JUPITER_API_KEY": "your_jupiter_api_key_here"
         }
       }
     }
   }
   ```

## 🛠️ Available Tools

### 1. **`search-token`** 
Search for tokens by symbol, name, or mint address with detailed market information.

**Inputs**:
- `query`: Token symbol (SOL, USDC), name (Solana), or mint address

**Returns**: Comprehensive token data including:
- Price and 24h change percentage
- Trading volume and liquidity metrics  
- Security audit (mint/freeze authority status)
- Organic score and verification status
- Holder count and market cap

### 2. **`get-balances`**
Get token balances for any wallet address with automatic token identification.

**Inputs**:
- `walletAddress` (optional): Wallet to check (defaults to configured wallet)
- `mints` (optional): Specific token mints to check

**Returns**: Complete portfolio overview including SOL and all SPL tokens with UI-friendly amounts.

### 3. **`get-ultra-order`**
Fetch optimized swap orders from Jupiter's Ultra API combining DEX routing and RFQ.

**Inputs**:
- `inputMint`: Input token mint address
- `outputMint`: Output token mint address  
- `amount`: Input amount as string (e.g., "1.23")
- `slippageBps`: Slippage tolerance in basis points (e.g., 50 for 0.5%)

**Returns**: Swap order with `requestId`, `transaction`, amounts, and calculated exchange rates.

### 4. **`execute-ultra-order`**
Execute swap transactions with intelligent error handling and status monitoring.

**Inputs**:
- `requestId`: Order ID from `get-ultra-order`
- `transaction`: Base64-encoded transaction

**Returns**: Execution results with transaction signature, Solscan links, and detailed status.

**Smart Features**:
- ✅ Pre-flight SOL balance checking
- 🔄 Automatic transaction status polling (up to 2 minutes)
- 🧠 Intelligent error analysis with helpful suggestions
- 🔗 Direct Solscan transaction links

## 💡 Usage Examples

### 1. Search for Tokens
```json
{
  "tool": "search-token",
  "arguments": {
    "query": "BONK"
  }
}
```

**Response**: Detailed token information including price, volume, security audit, and holder count.

### 2. Check Portfolio Balances
```json
{
  "tool": "get-balances",
  "arguments": {}
}
```

**Response**: Complete wallet overview with SOL and all SPL token balances in user-friendly format.

### 3. Execute Token Swap
**Step 1 - Get Quote:**
```json
{
  "tool": "get-ultra-order",
  "arguments": {
    "inputMint": "So11111111111111111111111111111111111111112",
    "outputMint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", 
    "amount": "0.1",
    "slippageBps": 50
  }
}
```

**Step 2 - Execute Swap:**
```json
{
  "tool": "execute-ultra-order", 
  "arguments": {
    "requestId": "uuid-from-step-1",
    "transaction": "base64-encoded-transaction-from-step-1"
  }
}
```

## 🛡️ Error Handling

The server provides intelligent error detection and user-friendly messages:

- **Insufficient SOL**: "❌ Insufficient SOL for transaction fees. Add 0.01 SOL (~$1.25) to your wallet"
- **Slippage Issues**: "⚠️ Slippage tolerance exceeded. Try increasing slippage or retry after some time"
- **Network Problems**: "🔄 Transaction status determination timeout. You can try again with the same order"

## 🔧 Troubleshooting

### Common Issues

**"HTTP 401: Unauthorized"**
- Check your `JUPITER_API_KEY` in environment variables
- Verify your API key at [Jupiter Portal](https://portal.jup.ag)

**"Insufficient SOL for transaction fees"**  
- Ensure wallet has at least 0.01 SOL for transaction fees
- Check SOL balance using `get-balances` tool

**"Connection to RPC failed"**
- Verify your `SOLANA_RPC_URL` is accessible
- Try using a different RPC endpoint (Helius, QuickNode, etc.)

## 📝 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/pipedude/jupiter-mcp/issues)
- **Jupiter Docs**: [Jupiter Developer Documentation](https://dev.jup.ag)
- **Solana Docs**: [Solana Developer Documentation](https://docs.solana.com)



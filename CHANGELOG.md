# Changelog

All notable changes to Jupiter MCP Server will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] - 2025-01-29

### Added
- **Token Search Tool**: New `search-token` function for finding tokens by symbol, name, or mint address
- **Portfolio Management**: Enhanced `get-balances` with automatic token identification
- **Smart Error Diagnostics**: Intelligent error analysis with helpful user guidance
- **SOL Fee Checking**: Pre-flight validation of sufficient SOL for transaction fees
- **Multi-language Support**: Full English localization for international users
- **Transaction Monitoring**: Automatic status polling up to 2 minutes with retry logic
- **Solscan Integration**: Direct transaction links for easy blockchain exploration

### Enhanced
- **Jupiter Ultra API**: Updated to latest Jupiter Ultra API endpoints with API key authentication
- **Exchange Rate Calculation**: Proper handling of token decimals for accurate price display
- **User Experience**: Added `inAmountUI` and `outAmountUI` fields for human-readable amounts
- **Error Messages**: Comprehensive error categorization with specific help suggestions

### Fixed
- **Rate Display**: Corrected exchange rate calculations accounting for token decimals
- **Balance Detection**: Fixed SOL balance display in portfolio overview
- **Transaction Status**: Improved transaction execution status determination
- **API Migration**: Updated from deprecated lite-api endpoints to current Jupiter API

### Security
- **Environment Variables**: Proper handling of sensitive configuration through .env files
- **API Key Management**: Secure Jupiter API key integration
- **Transaction Signing**: Maintained secure local transaction signing

## [1.0.0] - 2024-12-15

### Added
- Initial release of Jupiter MCP Server
- Basic token swap functionality via Jupiter Ultra API
- `get-ultra-order` tool for fetching swap quotes
- `execute-ultra-order` tool for executing swaps
- Support for Solana mainnet transactions
- MIT license and basic documentation

### Technical Details
- Built with MCP SDK v1.7.0
- Solana Web3.js integration
- Base58 private key support
- Environment-based configuration

# Across Bridge Automation Script

This project provides a script to automate cross-chain token transfers using the Across Protocol. It allows you to check quotes, execute transactions based on configurable thresholds, and monitor transaction status across multiple networks.

## Features

- Check quotes for cross-chain token transfers
- Set minimum acceptable output percentages after fees
- Set maximum acceptable fill times
- Execute transfers only when thresholds are met
- Monitor transaction status until completion
- Support for multiple networks (Ethereum, Optimism, Arbitrum, Base, Polygon, zkSync, Scroll, Mode, etc.)
- Support for multiple tokens (ETH, USDC, USDT, WBTC, and easily extendable)
- Transaction history tracking

## Prerequisites

- Node.js 16+
- A wallet private key for executing transactions

## Installation

1. Clone this repository:
   ```
   git clone https://github.com/yourusername/across-bridge-automation.git
   cd across-bridge-automation
   ```

2. Install dependencies:
   ```
   yarn install
   ```

3. Create a `.env` file based on the provided `.env.example`:
   ```
   cp .env.example .env
   ```

4. Edit the `.env` file with your private key:
   ```
   PRIVATE_KEY=your_private_key_here
   ```

## Starting Script
The `src/sampleArbToOptimism.js` script is a sample file that will take your through a step by step process of transfering native ETH from Arbitrum to Optimism.  This is a simplified version to help understand the flow of across network and sdk.

## Configuration

The project includes a configuration file ([tools/config.js](tools/config.js)) where you can set up:

1. Bridge operations to execute
2. Threshold settings for when to execute transfers
3. Monitoring settings
4. Token addresses for different chains

Edit the `BRIDGE_OPERATIONS` array in `config.js` to configure the transfers you want to execute:

```javascript
{
  name: "ETH Arbitrum to Optimism",
  enabled: true,
  tokenSymbol: "ETH",
  originChainId: 42161, // Arbitrum
  destinationChainId: 10, // Optimism
  inputAmount: 0.001, // Amount to transfer
  useNativeToken: true // Use native ETH instead of wrapped
}
```

Adjust the threshold settings to control when transfers are executed:

```javascript
const THRESHOLDS = {
  minOutputPercentage: 0.995, // 99.5% of input after fees
  maxFillTimeSeconds: 60,
  // ...
};
```

## Usage

Run the script with:

```
yarn sample   # Run a sample script to bridge ETH from Arbitrum to Optimism
yarn bridge   # Run the main bridge automation script
yarn test     # Run a test script to verify token and chain configurations
```

This will:
1. Check quotes for all enabled bridge operations
2. Execute transfers for operations that meet the threshold criteria
3. Monitor and report on transaction status

## Example Output

```
[10:15:30] Starting bridge operation for 0.1 ETH from chain 42161 to chain 10
[10:15:32] Checking quote for 0.1 from chain 42161 to chain 10
[10:15:33] Quote received:
[10:15:33] - Input amount: 0.1
[10:15:33] - Output amount: 0.0995
[10:15:33] - Estimated fill time: 45 seconds
[10:15:33] - Total relay fee: 0.0005
[10:15:33] Quote threshold check:
[10:15:33] - Output percentage: 99.5% (threshold: 99.5%)
[10:15:33] - Fill time: 45s (threshold: 60s)
[10:15:33] - Meets all thresholds: true
[10:15:33] Executing quote...
[10:15:33] Approving token transfer...
[10:15:45] Token approval successful: 0x1234...
[10:15:45] Depositing funds...
[10:15:58] Deposit successful:
[10:15:58] - Transaction hash: 0x5678...
[10:15:58] - Deposit ID: 42
[10:15:58] Waiting for fill on destination chain...
[10:16:40] Fill successful:
[10:16:40] - Fill transaction hash: 0x9abc...
[10:16:40] - Fill timestamp: 1722222222
[10:16:40] - Action success: true
```

## Adding Support for New Tokens

To add support for a new token:

1. Add the token addresses to the `TOKENS` object in `config.js`:
   ```javascript
   NEWTOKEN: {
     1: "0x...", // Address on Ethereum
     10: "0x...", // Address on Optimism
     // ...
   }
   ```

2. Create a new bridge operation in the `BRIDGE_OPERATIONS` array:
   ```javascript
   {
     name: "NEWTOKEN Ethereum to Arbitrum",
     enabled: true,
     tokenSymbol: "NEWTOKEN",
     originChainId: 1,
     destinationChainId: 42161,
     inputAmount: 10,
     decimals: 18 // Use the correct decimals for your token
   }
   ```

## Important Notes

- This code is as is, I accept no responsibility for any funds lost as this is demo code
- Always keep your private key secure and never share it
- Test with small amounts first before sending larger amounts
- Be aware of gas costs on different networks
- The script will automatically check if an amount is too low based on Across Protocol's minimum deposit requirements
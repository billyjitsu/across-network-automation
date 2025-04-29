// Configuration file for Across Bridge Automation
// Create a .env file with your private key: PRIVATE_KEY=your_private_key_here

// Bridge operations to execute
export const BRIDGE_OPERATIONS = [
  {
    name: "ETH Arbitrum to Optimism",
    enabled: true,
    tokenSymbol: "ETH",
    originChainId: 10, // Arbitrum 42161
    destinationChainId: 42161, // Optimism 10
    inputAmount: 0.001, // Small amount for testing
    decimals: 18,
    useNativeToken: true // Use native ETH instead of wrapped
  },
  {
    name: "USDC Ethereum to Polygon",
    enabled: false, // Set to true to enable this operation
    tokenSymbol: "USDC",
    originChainId: 1, // Ethereum
    destinationChainId: 137, // Polygon
    inputAmount: 10, // Start with a small amount
    decimals: 6, // USDC uses 6 decimals
    useBridged: false // Whether to use bridged version on destination
  },
  {
    name: "ETH Base to Ethereum",
    enabled: false, // Set to true to enable this operation
    tokenSymbol: "ETH",
    originChainId: 8453, // Base
    destinationChainId: 1, // Ethereum
    inputAmount: 0.005, // Small amount for testing
    decimals: 18,
    useNativeToken: true
  }
];

// Threshold settings for execution
export const THRESHOLDS = {
  // Minimum acceptable output amount as a percentage of input (after fees)
  // 0.995 means you want to receive at least 99.5% of your input after fees
  minOutputPercentage: 0.995,
  
  // Maximum acceptable fill time in seconds
  maxFillTimeSeconds: 60,
  
  // Retry settings if thresholds aren't met
  retry: {
    enabled: true,
    maxAttempts: 5,
    delayMinutes: 10
  }
};

// Monitoring settings
export const MONITORING = {
  // Polling interval for transaction status (in milliseconds)
  statusPollingInterval: 10000, // 10 seconds
  
  // Maximum polling attempts before giving up
  maxPollingAttempts: 30, // 5 minutes total (30 * 10 seconds)
  
  // Notification settings (could implement email or webhook notifications)
  notifications: {
    onStart: true,
    onThresholdFailure: true,
    onExecutionStart: true,
    onExecutionComplete: true,
    onError: true
  }
};

// Token addresses across all supported chains
export const TOKENS = {
  // ETH addresses across different chains
  ETH: {
    1: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH on Ethereum
    10: "0x4200000000000000000000000000000000000006", // WETH on Optimism
    42161: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", // WETH on Arbitrum
    8453: "0x4200000000000000000000000000000000000006", // WETH on Base
    137: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619", // WETH on Polygon
    324: "0x5AEa5775959fBC2557Cc8789bC1bf90A239D9a91", // WETH on zkSync
    59144: "0xe5D7C2a44FfDDf6b295A15c148167daaAf5Cf34f", // WETH on Linea
    81457: "0x4300000000000000000000000000000000000004", // WETH on Blast
    534352: "0x5300000000000000000000000000000000000004", // WETH on Scroll
    34443: "0x4200000000000000000000000000000000000006", // WETH on Mode
    7777777: "0x4200000000000000000000000000000000000006", // WETH on Zora
  },
  // USDC addresses across different chains
  USDC: {
    1: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC on Ethereum
    10: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85", // USDC on Optimism (native)
    "10-bridged": "0x7F5c764cBc14f9669B88837ca1490cCa17c31607", // USDC.e on Optimism (bridged)
    42161: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", // USDC on Arbitrum (native)
    "42161-bridged": "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8", // USDC.e on Arbitrum (bridged)
    8453: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC on Base (native)
    "8453-bridged": "0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA", // USDbC on Base (bridged)
    137: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359", // USDC on Polygon (native)
    "137-bridged": "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", // USDC.e on Polygon (bridged)
    324: "0x3355df6D4c9C3035724Fd0e3914dE96A5a83aaf4", // USDC.e on zkSync
    34443: "0xd988097fb8612cc24eeC14542bC03424c656005f", // USDC.e on Mode
    534352: "0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4", // USDC on Scroll
  },
  // Other popular tokens
  USDT: {
    1: "0xdAC17F958D2ee523a2206206994597C13D831ec7", // USDT on Ethereum
    10: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58", // USDT on Optimism
    137: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F", // USDT on Polygon
    42161: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", // USDT on Arbitrum
  },
  WBTC: {
    1: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", // WBTC on Ethereum
    10: "0x68f180fcCe6836688e9084f035309E29Bf0A2095", // WBTC on Optimism
    42161: "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f", // WBTC on Arbitrum
    137: "0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6", // WBTC on Polygon
  }
};

// Chain information for quick reference
export const CHAINS = {
  // Mainnet L1
  1: { 
    name: "Ethereum", 
    rpcUrl: "https://mainnet.gateway.tenderly.co",
    explorerUrl: "https://etherscan.io",
    spokePool: "0x5c7BCd6E7De5423a257D81B442095A1a6ced35C5",
  },
  // Major L2s and Sidechains
  10: { 
    name: "Optimism", 
    rpcUrl: "https://mainnet.optimism.io",
    explorerUrl: "https://optimistic.etherscan.io",
    spokePool: "0x6f26Bf09B1C792e3228e5467807a900A503c0281",
  },
  42161: { 
    name: "Arbitrum", 
    rpcUrl: "https://arb1.arbitrum.io/rpc",
    explorerUrl: "https://arbiscan.io",
    spokePool: "0xe35e9842fceaCA96570B734083f4a58e8F7C5f2A",
  },
  137: { 
    name: "Polygon", 
    rpcUrl: "https://rpc.ankr.com/polygon",
    explorerUrl: "https://polygonscan.com",
    spokePool: "0x9295ee1d8C5b022Be115A2AD3c30C72E34e7F096",
  },
  8453: { 
    name: "Base", 
    rpcUrl: "https://mainnet.base.org",
    explorerUrl: "https://basescan.org",
    spokePool: "0x09aea4b2242abC8bb4BB78D537A67a245A7bEC64",
  },
  // Emerging L2s
  324: { 
    name: "zkSync", 
    rpcUrl: "https://mainnet.era.zksync.io",
    explorerUrl: "https://explorer.zksync.io",
    spokePool: "0xE0B015E54d54fc84a6cB9B666099c46adE9335FF",
  },
  534352: { 
    name: "Scroll", 
    rpcUrl: "https://rpc.scroll.io",
    explorerUrl: "https://scrollscan.com",
    spokePool: "0x3baD7AD0728f9917d1Bf08af5782dCbD516cDd96",
  },
  34443: { 
    name: "Mode", 
    rpcUrl: "https://mainnet.mode.network",
    explorerUrl: "https://explorer.mode.network",
    spokePool: "0x3baD7AD0728f9917d1Bf08af5782dCbD516cDd96",
  }
};

// Token decimals for quick reference
export const TOKEN_DECIMALS = {
  ETH: 18,
  WETH: 18,
  USDC: 6,
  "USDC.e": 6,
  USDT: 6,
  WBTC: 8,
  DAI: 18,
};

// Script options
export const OPTIONS = {
  // Whether to automatically execute transactions or prompt for confirmation
  autoExecute: true, // Set to true for automatic execution
  
  // Default max slippage (as a percentage)
  maxSlippage: 0.5, // 0.5%
  
  // Whether to save transaction history to a file
  saveHistory: true,
  historyFile: "transaction_history.json",
  
  // Console output options
  verboseLogging: true,
  showQuoteDetails: true,
};
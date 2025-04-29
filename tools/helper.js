// Helper functions for working with the Across Bridge configuration
import { TOKENS, CHAINS, TOKEN_DECIMALS } from './config.js';

/**
 * Get token address for a specific chain and token symbol
 * @param {string} tokenSymbol - Token symbol (e.g., "ETH", "USDC")
 * @param {number} chainId - Chain ID
 * @param {boolean} useBridged - Whether to use bridged token version (for chains with native+bridged versions)
 * @returns {string} Token address
 */
export function getTokenAddress(tokenSymbol, chainId, useBridged = false) {
  // For tokens that have both native and bridged versions
  if (useBridged && ["USDC"].includes(tokenSymbol)) {
    const bridgedKey = `${chainId}-bridged`;
    if (TOKENS[tokenSymbol] && TOKENS[tokenSymbol][bridgedKey]) {
      return TOKENS[tokenSymbol][bridgedKey];
    }
  }
  
  // Standard token lookup
  if (TOKENS[tokenSymbol] && TOKENS[tokenSymbol][chainId]) {
    return TOKENS[tokenSymbol][chainId];
  }
  
  throw new Error(`Token ${tokenSymbol} not supported on chain ${chainId}`);
}

/**
 * Get token decimals for a token symbol
 * @param {string} tokenSymbol - Token symbol
 * @returns {number} Number of decimals
 */
export function getTokenDecimals(tokenSymbol) {
  if (TOKEN_DECIMALS[tokenSymbol]) {
    return TOKEN_DECIMALS[tokenSymbol];
  }
  
  // Default decimals
  switch (tokenSymbol) {
    case 'ETH':
    case 'WETH':
      return 18;
    case 'USDC':
    case 'USDC.e':
    case 'USDT':
      return 6;
    case 'WBTC':
      return 8;
    default:
      return 18;
  }
}

/**
 * Get chain name from chain ID
 * @param {number} chainId - Chain ID
 * @returns {string} Chain name
 */
export function getChainName(chainId) {
  if (CHAINS[chainId]) {
    return CHAINS[chainId].name;
  }
  
  return `Chain ${chainId}`;
}

/**
 * Get all supported chains
 * @returns {Array} Array of chain IDs
 */
export function getSupportedChains() {
  return Object.keys(CHAINS).map(id => parseInt(id));
}

/**
 * Get all supported tokens for a chain
 * @param {number} chainId - Chain ID
 * @returns {Array} Array of token symbols
 */
export function getSupportedTokensForChain(chainId) {
  const supportedTokens = [];
  
  Object.entries(TOKENS).forEach(([tokenSymbol, chainMap]) => {
    if (chainMap[chainId]) {
      supportedTokens.push(tokenSymbol);
    }
  });
  
  return supportedTokens;
}

/**
 * Check if a pair of chains supports bridging a specific token
 * @param {number} originChainId - Origin chain ID
 * @param {number} destinationChainId - Destination chain ID
 * @param {string} tokenSymbol - Token symbol
 * @returns {boolean} Whether the token is supported for this pair
 */
export function isBridgeSupportedForToken(originChainId, destinationChainId, tokenSymbol) {
  // Check if token exists on both chains
  if (!TOKENS[tokenSymbol] || 
      !TOKENS[tokenSymbol][originChainId] || 
      !TOKENS[tokenSymbol][destinationChainId]) {
    return false;
  }
  
  return true;
}

/**
 * Format amount for display with correct token symbol
 * @param {string|number|bigint} amount - Amount to format
 * @param {string} tokenSymbol - Token symbol
 * @returns {string} Formatted amount with token symbol
 */
export function formatTokenAmount(amount, tokenSymbol) {
  const decimals = getTokenDecimals(tokenSymbol);
  
  // Convert to number and format based on decimals
  const numAmount = Number(amount);
  let formatted;
  
  if (decimals === 18) {
    // For ETH-like tokens, show 6 decimal places max
    formatted = numAmount.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 6
    });
  } else if (decimals === 8) {
    // For BTC-like tokens, show 8 decimal places max
    formatted = numAmount.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 8
    });
  } else if (decimals === 6) {
    // For USDC-like tokens, show 2-4 decimal places
    formatted = numAmount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4
    });
  } else {
    // Default formatting
    formatted = numAmount.toLocaleString();
  }
  
  return `${formatted} ${tokenSymbol}`;
}

/**
 * Find available routes between chains for a token
 * @param {string} tokenSymbol - Token symbol
 * @returns {Array} Array of route objects with originChainId and destinationChainId
 */
export function findAvailableRoutes(tokenSymbol) {
  const routes = [];
  
  if (!TOKENS[tokenSymbol]) {
    return routes;
  }
  
  const supportedChains = Object.keys(TOKENS[tokenSymbol])
    .filter(key => !key.includes('-')) // Filter out special keys like '10-bridged'
    .map(id => parseInt(id));
  
  // Generate all possible routes between supported chains
  for (const originChain of supportedChains) {
    for (const destinationChain of supportedChains) {
      if (originChain !== destinationChain) {
        routes.push({
          originChainId: originChain,
          destinationChainId: destinationChain,
          tokenSymbol
        });
      }
    }
  }
  
  return routes;
}

/**
 * Generate a human-readable description of a bridge operation
 * @param {Object} operation - Bridge operation details
 * @returns {string} Human-readable description
 */
export function describeBridgeOperation(operation) {
  const {
    tokenSymbol,
    originChainId,
    destinationChainId,
    inputAmount,
    useNativeToken = tokenSymbol === 'ETH',
    decimals = getTokenDecimals(tokenSymbol)
  } = operation;
  
  const originChainName = getChainName(originChainId);
  const destinationChainName = getChainName(destinationChainId);
  const formattedAmount = formatTokenAmount(inputAmount, tokenSymbol);
  const tokenDisplay = tokenSymbol === 'ETH' && useNativeToken ? 'ETH (native)' : tokenSymbol;
  
  return `Bridge ${formattedAmount} from ${originChainName} to ${destinationChainName} using ${tokenDisplay}`;
}

/**
 * Create a route object for Across Protocol's getQuote function
 * @param {string} tokenSymbol - Token symbol 
 * @param {number} originChainId - Origin chain ID
 * @param {number} destinationChainId - Destination chain ID
 * @param {boolean} useNativeToken - Whether to use native token (for ETH)
 * @returns {Object} Route object for getQuote
 */
export function createRouteObject(tokenSymbol, originChainId, destinationChainId, useNativeToken = false) {
  const inputToken = getTokenAddress(tokenSymbol, originChainId);
  const outputToken = getTokenAddress(tokenSymbol, destinationChainId);
  
  const route = {
    originChainId: Number(originChainId), 
    destinationChainId: Number(destinationChainId),
    inputToken,
    outputToken,
  };
  
  // Add isNative flag for ETH
  if (tokenSymbol === 'ETH' && useNativeToken) {
    route.isNative = true;
  }
  
  return route;
}

// Export default object for compatibility
export default {
  getTokenAddress,
  getTokenDecimals,
  getChainName,
  getSupportedChains,
  getSupportedTokensForChain,
  isBridgeSupportedForToken,
  formatTokenAmount,
  findAvailableRoutes,
  describeBridgeOperation,
  createRouteObject
};
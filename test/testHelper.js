import {
  getTokenAddress,
  getTokenDecimals,
  getChainName,
  getSupportedChains,
  getSupportedTokensForChain,
  formatTokenAmount,
  describeBridgeOperation,
  findAvailableRoutes,
  createRouteObject,
  isBridgeSupportedForToken,
} from "../tools/helper.js";
import { CHAINS, TOKENS, BRIDGE_OPERATIONS } from "../tools/config.js";

function testConfiguration() {
  console.log("🔍 Testing Across Bridge Configuration\n");

  // Test chain information
  console.log("📍 Supported Chains:");
  const chains = getSupportedChains();
  chains.forEach((chainId) => {
    console.log(`- ${getChainName(chainId)} (${chainId})`);
    if (CHAINS[chainId].spokePool) {
      console.log(`  Spoke Pool: ${CHAINS[chainId].spokePool}`);
    }
  });

  // Test tokens per chain
  console.log("\n💰 Supported Tokens per Chain:");
  chains.forEach((chainId) => {
    const tokens = getSupportedTokensForChain(chainId);
    console.log(`\n${getChainName(chainId)}:`);
    tokens.forEach((token) => {
      try {
        const address = getTokenAddress(token, chainId);
        const decimals = getTokenDecimals(token);
        console.log(`- ${token}: ${address} (${decimals} decimals)`);

        // Test bridged version if it's USDC
        if (token === "USDC") {
          try {
            const bridgedAddress = getTokenAddress(token, chainId, true);
            console.log(`  Bridged version: ${bridgedAddress}`);
          } catch (error) {
            // It's okay if no bridged version exists
          }
        }
      } catch (error) {
        console.log(`- ❌ Error with ${token}: ${error.message}`);
      }
    });
  });

  // Test available routes
  console.log("\n🛣️  Testing Available Routes:");
  const testTokens = ["USDC", "ETH", "WBTC"]; // Common tokens
  testTokens.forEach((token) => {
    console.log(`\nRoutes for ${token}:`);
    try {
      const routes = findAvailableRoutes(token);
      routes.slice(0, 5).forEach((route) => {
        // Limit to 5 routes to avoid overwhelming output
        console.log(
          `- ${getChainName(route.originChainId)} → ${getChainName(
            route.destinationChainId
          )}: ${
            isBridgeSupportedForToken(
              route.originChainId,
              route.destinationChainId,
              token
            )
              ? "✅"
              : "❌"
          }`
        );
      });
      if (routes.length > 5) {
        console.log(`  ... and ${routes.length - 5} more routes`);
      }
    } catch (error) {
      console.log(`  ❌ Error with ${token} routes: ${error.message}`);
    }
  });

  // Test amount formatting
  console.log("\n💱 Testing Amount Formatting:");
  const testAmounts = [
    { amount: "1000000000000000000", token: "ETH" },
    { amount: "1000000", token: "USDC" },
    { amount: "100000000", token: "WBTC" },
  ];
  testAmounts.forEach(({ amount, token }) => {
    console.log(`- ${amount} wei → ${formatTokenAmount(amount, token)}`);
  });

  // Test bridge operation description
  console.log("\n📝 Testing Bridge Operation Descriptions:");
  BRIDGE_OPERATIONS.forEach((operation) => {
    try {
      console.log(`- ${operation.name}: ${describeBridgeOperation(operation)}`);

      // Test route object creation
      const route = createRouteObject(
        operation.tokenSymbol,
        operation.originChainId,
        operation.destinationChainId,
        operation.useNativeToken || false
      );
      console.log(`  Route input token: ${route.inputToken}`);
      console.log(`  Route output token: ${route.outputToken}`);
      if (route.isNative) {
        console.log(`  Using native token: ${route.isNative}`);
      }
    } catch (error) {
      console.log(`- ❌ Error with ${operation.name}: ${error.message}`);
    }
  });
}

// Run the tests
try {
  console.log("🧪 Running Across Bridge Configuration Tests");
  console.log("===========================================");
  testConfiguration();
  console.log("\n✅ All tests completed!");
} catch (error) {
  console.error("❌ Test failed:", error.message);
  console.error(error.stack);
}

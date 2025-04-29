import dotenv from "dotenv";
import { createAcrossClient } from "@across-protocol/app-sdk";
import { createWalletClient, http, parseUnits, formatUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import fs from "fs";
import axios from "axios";
import {
  BRIDGE_OPERATIONS,
  THRESHOLDS,
  MONITORING,
  CHAINS,
  OPTIONS,
} from "../tools/config.js";
import {
  getTokenAddress,
  getTokenDecimals,
  getChainName,
  describeBridgeOperation,
  createRouteObject,
} from "../tools/helper.js";

// Load environment variables
dotenv.config();

// Initialize private key from environment
const privateKey = process.env.PRIVATE_KEY;
if (!privateKey) {
  console.error("Error: PRIVATE_KEY environment variable is required");
  process.exit(1);
}

// Initialize the account
const account = privateKeyToAccount(`0x${privateKey}`);

// Initialize Across client with supported chains
const supportedChains = Object.keys(CHAINS).map((id) => {
  return {
    id: Number(id),
    name: CHAINS[id].name,
    rpcUrls: {
      default: {
        http: [CHAINS[id].rpcUrl],
      },
    },
  };
});

const client = createAcrossClient({
  chains: supportedChains,
});

// Helper function to log with timestamp
function logWithTime(message) {
  const now = new Date();
  const timestamp = now.toLocaleTimeString();
  console.log(`[${timestamp}] ${message}`);
}

// Save transaction to history file
function saveTransactionToHistory(operation, result, quote = null) {
  if (!OPTIONS.saveHistory) return;

  const historyFile = OPTIONS.historyFile;
  let history = [];

  // Try to read existing history
  try {
    if (fs.existsSync(historyFile)) {
      const data = fs.readFileSync(historyFile, "utf8");
      history = JSON.parse(data);
    }
  } catch (error) {
    logWithTime(`Warning: Could not read history file: ${error.message}`);
  }

  // Prepare the data - Convert any BigInt values to strings
  const safeOperation = {
    name: operation.name,
    tokenSymbol: operation.tokenSymbol,
    originChainId: Number(operation.originChainId),
    destinationChainId: Number(operation.destinationChainId),
    inputAmount: operation.inputAmount.toString(),
  };

  // Convert any potential BigInt values in the result to strings
  const safeResult = {
    success: result.success,
    depositId: result.depositId ? result.depositId.toString() : null,
    originTxHash: result.originTxHash || null,
    destinationTxHash: result.destinationTxHash || null,
    error: result.error || null,
  };

  // Add output amount if available from quote
  if (quote && quote.deposit && quote.deposit.outputAmount) {
    try {
      const decimals =
        operation.decimals || getTokenDecimals(operation.tokenSymbol);
      safeResult.outputAmount = formatUnits(
        quote.deposit.outputAmount,
        decimals
      );

      // Calculate fees
      if (quote.fees) {
        const totalFee = {
          relayFee: quote.fees.totalRelayFee?.total
            ? formatUnits(quote.fees.totalRelayFee.total, decimals)
            : "0",
          lpFee: quote.fees.lpFee?.total
            ? formatUnits(quote.fees.lpFee.total, decimals)
            : "0",
        };
        safeResult.fees = totalFee;
      }
    } catch (error) {
      logWithTime(`Warning: Could not format output amount: ${error.message}`);
      // If BigInt conversion fails, store as string
      safeResult.outputAmount = quote.deposit.outputAmount.toString();
    }
  }

  // Add new transaction with safe values
  history.push({
    timestamp: new Date().toISOString(),
    operation: safeOperation,
    result: safeResult,
  });

  // Save updated history
  try {
    fs.writeFileSync(historyFile, JSON.stringify(history, null, 2));
    if (OPTIONS.verboseLogging) {
      logWithTime(`Transaction saved to history file`);
    }
  } catch (error) {
    logWithTime(`Error: Could not save to history file: ${error.message}`);
  }
}

// Get a quote for bridging
async function getQuote(operation) {
  try {
    const {
      tokenSymbol,
      originChainId,
      destinationChainId,
      inputAmount,
      useNativeToken = false,
    } = operation;

    // Get decimals for the token
    const decimals = operation.decimals || getTokenDecimals(tokenSymbol);

    // Parse the amount with the correct decimals
    const parsedAmount = parseUnits(inputAmount.toString(), decimals);

    // Create route object for the quote
    const route = createRouteObject(
      tokenSymbol,
      originChainId,
      destinationChainId,
      useNativeToken
    );

    // Get quote from Across
    if (OPTIONS.verboseLogging) {
      logWithTime(`Getting quote for ${describeBridgeOperation(operation)}`);
    }

    const quote = await client.getQuote({
      route,
      inputAmount: parsedAmount,
    });

    // Log quote details if enabled
    if (OPTIONS.showQuoteDetails) {
      logWithTime(`Quote details:`);
      logWithTime(
        `- Input amount: ${formatUnits(
          quote.deposit.inputAmount,
          decimals
        )} ${tokenSymbol}`
      );
      logWithTime(
        `- Output amount: ${formatUnits(
          quote.deposit.outputAmount,
          decimals
        )} ${tokenSymbol}`
      );
      logWithTime(
        `- Estimated fill time: ${quote.estimatedFillTimeSec} seconds`
      );

      const relayFee = quote.fees.totalRelayFee.total;
      logWithTime(
        `- Total relay fee: ${formatUnits(relayFee, decimals)} ${tokenSymbol}`
      );

      const lpFee = quote.fees.lpFee.total;
      logWithTime(`- LP fee: ${formatUnits(lpFee, decimals)} ${tokenSymbol}`);

      // Calculate and log the total fee percentage
      const totalFee = BigInt(relayFee) + BigInt(lpFee);
      const feePercentage =
        (Number(totalFee) / Number(quote.deposit.inputAmount)) * 100;
      logWithTime(`- Total fee percentage: ${feePercentage.toFixed(4)}%`);
    }

    return quote;
  } catch (error) {
    logWithTime(`Error getting quote: ${error.message}`);
    throw error;
  }
}

// Check if a quote meets our thresholds
function quoteExceedsThresholds(quote, operation) {
  const { inputAmount } = operation;
  const decimals =
    operation.decimals || getTokenDecimals(operation.tokenSymbol);

  // Convert amounts to compare them
  const parsedInputAmount = parseUnits(inputAmount.toString(), decimals);

  // Calculate the output percentage relative to input
  const outputPercentage =
    Number(quote.deposit.outputAmount) / Number(parsedInputAmount);

  // Check if the quote meets our thresholds
  const meetsOutputThreshold =
    outputPercentage >= THRESHOLDS.minOutputPercentage;
  const meetsFillTimeThreshold =
    quote.estimatedFillTimeSec <= THRESHOLDS.maxFillTimeSeconds;

  // Log threshold checks
  logWithTime(`Threshold check:`);
  logWithTime(
    `- Output percentage: ${(outputPercentage * 100).toFixed(4)}% (minimum: ${
      THRESHOLDS.minOutputPercentage * 100
    }%)`
  );
  logWithTime(
    `- Fill time: ${quote.estimatedFillTimeSec}s (maximum: ${THRESHOLDS.maxFillTimeSeconds}s)`
  );
  logWithTime(
    `- Meets all thresholds: ${meetsOutputThreshold && meetsFillTimeThreshold}`
  );

  return meetsOutputThreshold && meetsFillTimeThreshold;
}

// Execute a quote
async function executeQuote(quote, operation) {
  try {
    logWithTime(`Executing bridge transaction for ${operation.name}...`);

    // Set up wallet client for the origin chain
    const walletClient = createWalletClient({
      account,
      chain: {
        id: Number(operation.originChainId),
        name: CHAINS[operation.originChainId].name,
        rpcUrls: {
          default: {
            http: [CHAINS[operation.originChainId].rpcUrl],
          },
        },
      },
      transport: http(CHAINS[operation.originChainId].rpcUrl),
    });

    // Transaction result tracking
    const result = {
      success: false,
      depositId: null,
      originTxHash: null,
      destinationTxHash: null,
      error: null,
    };

    // Execute the quote
    await client.executeQuote({
      walletClient,
      deposit: quote.deposit,
      onProgress: (progress) => {
        if (progress.step === "approve") {
          if (progress.status === "pending") {
            logWithTime(`Approving token transfer...`);
          } else if (progress.status === "txSuccess") {
            logWithTime(
              `Token approval successful: ${progress.txReceipt.transactionHash}`
            );
          }
        }

        if (progress.step === "deposit") {
          if (progress.status === "pending") {
            logWithTime(`Sending funds to Across...`);
          } else if (progress.status === "txSuccess") {
            result.depositId = progress.depositId;
            result.originTxHash = progress.txReceipt.transactionHash;

            logWithTime(`Deposit successful:`);
            logWithTime(
              `- Transaction hash: ${progress.txReceipt.transactionHash}`
            );
            logWithTime(`- Deposit ID: ${progress.depositId}`);
            logWithTime(
              `- Waiting for funds to be bridged to ${getChainName(
                operation.destinationChainId
              )}...`
            );
          }
        }

        if (progress.step === "fill") {
          if (progress.status === "pending") {
            logWithTime(
              `Relayer processing your transfer on destination chain...`
            );
          } else if (progress.status === "txSuccess") {
            // Mark transaction as successful when fill is complete
            result.success = true;

            if (progress.txReceipt) {
              result.destinationTxHash = progress.txReceipt.transactionHash;
              logWithTime(
                `Bridge complete! Funds received on ${getChainName(
                  operation.destinationChainId
                )}`
              );
              logWithTime(
                `- Fill transaction hash: ${progress.txReceipt.transactionHash}`
              );
            } else {
              logWithTime(
                `Bridge complete! Funds received on ${getChainName(
                  operation.destinationChainId
                )}`
              );
            }

            // Fix for BigInt conversion - handle the timestamp safely
            if (progress.fillTxTimestamp) {
              let timestamp;
              try {
                // Handle if it's a BigInt by converting to string first
                if (typeof progress.fillTxTimestamp === "bigint") {
                  timestamp = new Date(
                    Number(progress.fillTxTimestamp.toString()) * 1000
                  );
                } else {
                  timestamp = new Date(progress.fillTxTimestamp);
                }
                logWithTime(`- Fill timestamp: ${timestamp.toLocaleString()}`);
              } catch (error) {
                logWithTime(
                  `- Fill timestamp: [Timestamp not available in readable format]`
                );
              }
            }
          }
        }
      },
    });

    return result;
  } catch (error) {
    logWithTime(`Error executing quote: ${error.message}`);
    return {
      success: false,
      error: error.message,
    };
  }
}

// Poll the status of a deposit
async function pollDepositStatus(originChainId, depositId) {
  logWithTime(`Polling status for deposit ID: ${depositId}`);

  let attempts = 0;
  let completed = false;

  while (!completed && attempts < MONITORING.maxPollingAttempts) {
    attempts++;

    try {
      const url = `https://app.across.to/api/deposit/status?originChainId=${originChainId}&depositId=${depositId}`;
      const response = await axios.get(url);
      const status = response.data;

      logWithTime(
        `Deposit status (attempt ${attempts}): ${status.status.toLowerCase()}`
      );

      // Check for successful completion
      const statusLower = status.status.toLowerCase();
      if (statusLower === "filled" || statusLower === "success") {
        logWithTime(`Deposit successfully completed!`);
        completed = true;
        return true;
      } else if (statusLower === "failed") {
        logWithTime(`Deposit failed!`);
        completed = true;
        return false;
      }
      // Added check for "fill" or "filled" status to consider it complete
      else if (statusLower === "fill" || statusLower === "filled") {
        logWithTime(`Deposit successful! (Status: ${status.status})`);
        completed = true;
        return true;
      } else {
        logWithTime(
          `Deposit still in progress. Waiting ${
            MONITORING.statusPollingInterval / 1000
          } seconds for next check...`
        );
        await new Promise((resolve) =>
          setTimeout(resolve, MONITORING.statusPollingInterval)
        );
      }
    } catch (error) {
      logWithTime(`Error polling deposit status: ${error.message}`);
      await new Promise((resolve) =>
        setTimeout(resolve, MONITORING.statusPollingInterval)
      );
    }
  }

  if (!completed) {
    logWithTime(
      `Exceeded maximum polling attempts. Please check the deposit status manually.`
    );
  }

  return completed;
}

// Execute a single bridge operation
async function executeBridgeOperation(operation) {
  try {
    logWithTime(`\n----------------------------------------------------`);
    logWithTime(`STARTING BRIDGE OPERATION: ${operation.name}`);
    logWithTime(`${describeBridgeOperation(operation)}`);
    logWithTime(`----------------------------------------------------`);

    // Get quote
    const quote = await getQuote(operation);

    // Check if quote meets threshold
    if (!quoteExceedsThresholds(quote, operation)) {
      logWithTime(`Quote does not meet thresholds. Operation cancelled.`);

      if (MONITORING.notifications.onThresholdFailure) {
        // You could implement notification logic here
        logWithTime(
          `Notification: Thresholds not met for operation ${operation.name}`
        );
      }

      const result = {
        success: false,
        error: "Quote did not meet thresholds",
      };
      saveTransactionToHistory(operation, result, quote);

      return false;
    }

    // Ask for confirmation if auto-execute is disabled
    if (!OPTIONS.autoExecute) {
      logWithTime(`\nQuote meets thresholds and is ready to execute.`);
      logWithTime(
        `Since auto-execute is disabled, please modify the config.js file to enable it.`
      );
      logWithTime(
        `Set OPTIONS.autoExecute = true to automatically execute transactions.`
      );

      const result = {
        success: false,
        error: "Auto-execute disabled",
      };
      saveTransactionToHistory(operation, result, quote);

      return false;
    }

    // Execute quote
    if (MONITORING.notifications.onExecutionStart) {
      // You could implement notification logic here
      logWithTime(
        `Notification: Starting execution of operation ${operation.name}`
      );
    }

    // Execute the transaction
    const result = await executeQuote(quote, operation);

    // Only poll if needed and depositId exists
    if (result.depositId && !result.success) {
      // Poll deposit status - this will run if the transaction isn't already marked as successful
      const statusResult = await pollDepositStatus(
        operation.originChainId,
        result.depositId
      );
      // Update result success based on status poll
      if (statusResult) {
        result.success = true;
      }
    }

    // Save result to history - with BigInt safe conversion - now passing the quote object
    saveTransactionToHistory(operation, result, quote);

    if (MONITORING.notifications.onExecutionComplete) {
      // You could implement notification logic here
      logWithTime(
        `Notification: Operation ${operation.name} completed with status: ${
          result.success ? "Success" : "Failed"
        }`
      );
    }

    return result.success;
  } catch (error) {
    logWithTime(`Error executing bridge operation: ${error.message}`);

    if (MONITORING.notifications.onError) {
      // You could implement notification logic here
      logWithTime(
        `Notification: Error in operation ${operation.name}: ${error.message}`
      );
    }

    const result = {
      success: false,
      error: error.message,
    };
    saveTransactionToHistory(operation, result);

    return false;
  }
}

// Main function
async function main() {
  try {
    logWithTime(`Starting Across Bridge Automation`);
    logWithTime(`Using account: ${account.address}`);

    // Filter enabled operations
    const enabledOperations = BRIDGE_OPERATIONS.filter((op) => op.enabled);

    if (enabledOperations.length === 0) {
      logWithTime(
        `No enabled bridge operations found in config.js. Please enable at least one operation.`
      );
      return;
    }

    logWithTime(`Found ${enabledOperations.length} enabled operations:`);
    enabledOperations.forEach((op, index) => {
      logWithTime(`${index + 1}. ${op.name}: ${describeBridgeOperation(op)}`);
    });

    // Execute each enabled operation
    for (const operation of enabledOperations) {
      await executeBridgeOperation(operation);
    }

    logWithTime(`All operations completed. Exiting.`);
  } catch (error) {
    logWithTime(`Fatal error: ${error.message}`);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main().catch(console.error);

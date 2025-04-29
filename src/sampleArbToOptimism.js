// Example script to bridge ETH from Arbitrum to Optimism
import { createAcrossClient } from "@across-protocol/app-sdk";
import { optimism, arbitrum, mainnet } from "viem/chains";
import { createWalletClient, http, parseEther, formatEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import dotenv from "dotenv";

dotenv.config();

async function bridgeETHFromArbitrumToOptimism() {
  try {
    console.log("Starting bridge operation from Arbitrum to Optimism...");

    // 1. Initialize wallet client with your private key
    if (!process.env.PRIVATE_KEY) {
      throw new Error("PRIVATE_KEY is required in .env file");
    }

    const account = privateKeyToAccount(`0x${process.env.PRIVATE_KEY}`);
    const walletClient = createWalletClient({
      account,
      chain: arbitrum, // Source chain
      transport: http(),
    });

    // 2. Initialize Across client (no integrator ID needed for personal use)
    const client = createAcrossClient({
      chains: [optimism, arbitrum, mainnet],
    });

    // 3. Get quote for 0.001 ETH from Arbitrum to Optimism
    const amountToSend = 0.001; // ETH
    console.log(`Getting quote for ${amountToSend} ETH...`);

    // https://github.com/across-protocol/toolkit/blob/c5010eb07312a936b6f59123afb4a7293bf2436b/packages/sdk/src/actions/getQuote.ts#L36
    // We use Wrapped ETH (WETH) as a base for Native ETH, then we use the isNative flag to indicate that we want to bridge native ETH.
    const route = {
      originChainId: arbitrum.id,
      destinationChainId: optimism.id,
      inputToken: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", // WETH on Arbitrum
      outputToken: "0x4200000000000000000000000000000000000006", // WETH on Optimism
      isNative: true, // Indicates that the token is native ETH
    };

    const quote = await client.getQuote({
      route,
      inputAmount: parseEther(amountToSend.toString()),
    });
    // console.log("Quote received:", quote);

    // 4. Log quote details
    console.log("Quote received:");
    console.log(
      `- Output amount: ${formatEther(quote.deposit.outputAmount)} ETH`
    );
    console.log(`- Estimated fill time: ${quote.estimatedFillTimeSec} seconds`);
    console.log(
      `- Total relay fee: ${formatEther(quote.fees.totalRelayFee.total)} ETH`
    );

    // 5. Check if amount is acceptable (you can customize this threshold)
    const outputPercentage =
      Number(quote.deposit.outputAmount) /
      Number(parseEther(amountToSend.toString()));
    console.log(`- Output percentage: ${(outputPercentage * 100).toFixed(2)}%`);

    const acceptableThreshold = 0.9905; // 99.5%
    if (outputPercentage < acceptableThreshold) {
      console.log(
        `Output percentage below threshold of ${
          acceptableThreshold * 100
        }%. Cancelling transaction.`
      );
      return;
    }

    // 6. Execute the quote if acceptable
    console.log("Executing bridge transaction...");
    let depositId = null;

    await client.executeQuote({
      walletClient,
      deposit: quote.deposit,
      onProgress: (progress) => {
        if (progress.step === "approve") {
          if (progress.status === "pending") {
            console.log("Approving token transfer...");
          } else if (progress.status === "txSuccess") {
            console.log(
              `Token approval successful: ${progress.txReceipt.transactionHash}`
            );
          }
        }

        if (progress.step === "deposit") {
          if (progress.status === "pending") {
            console.log("Depositing funds...");
          } else if (progress.status === "txSuccess") {
            depositId = progress.depositId;
            console.log(
              `Deposit successful: ${progress.txReceipt.transactionHash}`
            );
            console.log(`Deposit ID: ${depositId}`);
          }
        }

        if (progress.step === "fill") {
          if (progress.status === "pending") {
            console.log("Waiting for fill on destination chain...");
          } else if (progress.status === "txSuccess") {
            console.log("Fill successful!");
            if (progress.txReceipt) {
              console.log(
                `Fill transaction hash: ${progress.txReceipt.transactionHash}`
              );
            }
          }
        }
      },
    });

    console.log("Bridge operation completed!");

    // 7. Optionally check the status of your deposit using the Across API
    if (depositId) {
      console.log(
        `You can check your deposit status at: https://app.across.to/api/deposit/status?originChainId=42161&depositId=${depositId}`
      );
    }
  } catch (error) {
    console.error("Bridge operation failed:", error.message);
    console.error("Stack trace:", error.stack);

    // If there are additional error details, log them
    if (error.details) {
      console.error("Error details:", error.details);
    }
  }
}

// Run the bridge operation
bridgeETHFromArbitrumToOptimism().catch(console.error);

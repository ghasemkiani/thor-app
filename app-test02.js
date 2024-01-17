// Imports

// import {AssetRuneNative} from "@xchainjs/xchain-util";
// import {assetAmount, assetFromString, assetToBase, Chain} from "@xchainjs/xchain-util";
// import {CryptoAmount, EstimateSwapParams, Wallet, Midgard, SwapEstimate, ThorchainAMM} from "@xchainjs/xchain-thorchain-amm";

import util from "@xchainjs/xchain-util";
console.log(util);
const {AssetRuneNative, assetAmount, assetFromString, assetToBase, Chain} = util;
import amm from "@xchainjs/xchain-thorchain-amm";
console.log(amm);
const {CryptoAmount, EstimateSwapParams, Wallet, Midgard, SwapEstimate, ThorchainAMM} = amm;

import BigNumber from "bignumber.js";

let phrase = "phrase";
const mainnetWallet = new Wallet("mainnet", phrase || "you forgot to set the phrase");
const swapParams = {
	input: new CryptoAmount(assetToBase(assetAmount(1)), BUSD),
	destinationAsset: AssetRuneNative,
	destinationAddress: mainnetWallet.clients[Chain.THORChain].getAddress(),
	slipLimit: new BigNumber(0.03),
};
try {
	const outPutCanSwap = await thorchainQueryMainnet.estimateSwap(estimateSwapParams)
		print(outPutCanSwap)
		if (outPutCanSwap.txEstimate.canSwap) {
			const output = await mainetThorchainAmm.doSwap(mainnetWallet, estimateSwapParams);
			console.log(`Tx hash: ${output.hash},\n Tx url: ${output.url}\n WaitTime: ${output.waitTimeSeconds}`);
			expect(output).toBeTruthy();
		}
} catch (error) {
	console.log(error.message)
}

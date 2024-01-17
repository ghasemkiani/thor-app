import dateformat from "dateformat";
import {SysPass} from "@ghasemkiani/pass";

import {Network} from "@xchainjs/xchain-client"
import {Midgard, MidgardCache, MidgardQuery} from "@xchainjs/xchain-midgard-query"
import xchainthorchainquery from "@xchainjs/xchain-thorchain-query";
const {
  QuoteSwapParams,
  SwapEstimate,
  ThorchainCache,
  ThorchainQuery,
  Thornode,
  TxDetails,
} = xchainthorchainquery;
import {CryptoAmount, assetAmount, assetFromString, assetToBase, register9Rheader} from "@xchainjs/xchain-util";
import axios from "axios";

import {cutil} from "@ghasemkiani/base";
import {App as AppBase} from "@ghasemkiani/base-app";

const df = date => dateformat(date, "yyyy-mm-dd HH:MM:ss");
const pass = await SysPass.toGetPass();

class App extends AppBase {
	static {
		cutil.extend(this.prototype, {
			prefsId: "gkthor",
			defaultPrefs: {
				network: "mainnet",
			},
			_network: null,
		});
	}
	get network() {
		if (cutil.na(this._network)) {
			this._network = this.prefs.network || "mainnet";
		}
		return this._network;
	}
	set network(network) {
		this._network = network;
	}
	async toDefineInitOptions() {
		await super.toDefineInitOptions();
		let app = this;
		app.commander.option("-n, --network <network>", "network (mainnet/stagenet)");
		app.commander.option("--set-network <network>", "set network permanently (mainnet/stagenet)");
		app.commander.command("swap?")
			.description("estimate swap")
			.argument("<assets>", "assets (in/out)")
			.option("-i, --amount <amount>", "input amount")
			.option("-d, --decimals <decimals>", "decimals")
			.option("-t, --tolerance <tolerance>", "slippage tolerance")
			.option("-a, --address <address>", "destination address")
			.option("-k, --key <key>", "pass key")
			.option("-p, --phrase <phrase>", "mnemonic phrase")
			.action(async (assets, {amount, decimals, tolerance, address, key, phrase}) => {
				app.sub("run", async () => {
					await app.toEstimateSwap({assets, amount, decimals, tolerance, address, key, phrase});
				})
			});
	}
	async toApplyInitOptions() {
		await super.toApplyInitOptions();
		let app = this;
		
		register9Rheader(axios);
		
		let opts = app.commander.opts();
		if (cutil.a(opts.setNetwork)) {
			app.network = null;
			app.prefs.network = opts.setNetwork;
		}
		if (cutil.a(opts.network)) {
			app.network = opts.setNetwork;
		}
	}
	async toEstimateSwap({assets, amount, decimals = "8", tolerance = "0.01", address, key, phrase}) {
		let app = this;
		try {
			let {network} = app;
			let toleranceBps = cutil.asNumber(tolerance) * 1e4;
			let [assetIn, assetOut] = cutil.asString(assets).split("/");
			let fromAsset = assetFromString(assetIn);
			let toAsset = assetFromString(assetOut);
			// amount = cutil.asNumber(amount);
			decimals = cutil.asNumber(decimals);
			let toDestinationAddress = address;
			let midgardCache = new MidgardCache(new Midgard(network));
			let thorchainCache = new ThorchainCache(new Thornode(network), new MidgardQuery(midgardCache));
			let thorchainQuery = new ThorchainQuery(thorchainCache);
			let swapParams = {
				fromAsset,
				destinationAsset: toAsset,
				amount: new CryptoAmount(assetToBase(assetAmount(amount, decimals)), fromAsset),
				destinationAddress: toDestinationAddress,
				toleranceBps,
			};
			let txDetails = await thorchainQuery.quoteSwap(swapParams);
			// console.log(txDetails);
			let estimate = txDetails.txEstimate;
			let input = swapParams.amount;
			let txEstimate = {
				input: input.formatedAssetString(),
				totalFees: {
					outboundFee: estimate.totalFees.outboundFee.formatedAssetString(),
					affiliateFee: estimate.totalFees.affiliateFee.formatedAssetString(),
				},
				slipBasisPoints: estimate.slipBasisPoints.toFixed(),
				netOutput: estimate.netOutput.formatedAssetString(),
				inboundConfirmationSeconds: estimate.inboundConfirmationSeconds,
				outboundDelaySeconds: estimate.outboundDelaySeconds,
				canSwap: estimate.canSwap,
				errors: estimate.errors,
			};
			let output = {
				memo: txDetails.memo,
				expiry: df(txDetails.expiry),
				toAddress: txDetails.toAddress,
				txEstimate,
			};
			console.log(output);
		} catch (e) {
			console.log(e);
		}
	}
}

export {App};

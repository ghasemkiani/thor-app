import dateformat from "dateformat";
import {SysPass} from "@ghasemkiani/pass";

import cosmosclientcore from "@cosmos-client/core";
const { default: cosmosclient } = cosmosclientcore;
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
import {Wallet} from "@xchainjs/xchain-thorchain-amm";
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
				passkey: null,
			},
			_network: null,
			_passkey: null,
			_phrase: null,
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
	get passkey() {
		if (cutil.na(this._passkey)) {
			this._passkey = this.prefs.passkey;
		}
		return this._passkey;
	}
	set passkey(passkey) {
		this._passkey = passkey;
	}
	get phrase() {
		if (cutil.na(this._phrase) && cutil.a(this.passkey)) {
			this._phrase = pass.get(this.passkey);
		}
		return this._phrase;
	}
	set phrase(phrase) {
		this._phrase = phrase;
	}
	async toDefineInitOptions() {
		await super.toDefineInitOptions();
		let app = this;
		app.commander.option("-n, --network <network>", "network (mainnet/stagenet)");
		app.commander.option("--set-network <network>", "set network permanently (mainnet/stagenet)");
		app.commander.option("-k, --key <key>", "pass key");
		app.commander.option("--set-key <key>", "set pass key permanently");
		app.commander.option("-p, --phrase <phrase>", "mnemonic phrase");
		app.commander.command("send")
			.description("send funds to another address")
			.argument("<asset>", "asset to send")
			.option("-a, --amount <amount>", "amount to send")
			.option("-d, --decimals <decimals>", "decimals")
			.option("-t, --to-address <address>", "destination address")
			.option("-m, --memo <memo>", "transaction memo")
			.action(async (asset, {amount, decimals, toAddress, memo}) => {
				app.sub("run", async () => {
					await app.toSend({asset, amount, decimals, toAddress, memo});
				})
			});
		app.commander.command("pools")
			.description("show pool info")
			.action(async () => {
				app.sub("run", async () => {
					await app.toShowPools();
				})
			});
		app.commander.command("swap?")
			.description("estimate swap")
			.argument("<assets>", "assets (in/out)")
			.option("-i, --amount <amount>", "input amount")
			.option("-d, --decimals <decimals>", "decimals")
			.option("-t, --tolerance <tolerance>", "slippage tolerance")
			.option("-a, --address <address>", "destination address")
			.action(async (assets, {amount, decimals, tolerance, address}) => {
				app.sub("run", async () => {
					await app.toEstimateSwap({assets, amount, decimals, tolerance, address});
				})
			});
	}
	async toApplyInitOptions() {
		await super.toApplyInitOptions();
		let app = this;
		
		register9Rheader(cosmosclient.config.globalAxios)
		register9Rheader(axios);
		
		let opts = app.commander.opts();
		if (cutil.a(opts.setNetwork)) {
			app.network = null;
			app.prefs.network = opts.setNetwork;
		}
		if (cutil.a(opts.network)) {
			app.network = opts.network;
		}
		if (cutil.a(opts.setKey)) {
			app.passkey = null;
			app.prefs.passkey = opts.setKey;
		}
		if (cutil.a(opts.key)) {
			app.passkey = opts.key;
		}
		if (cutil.a(opts.phrase)) {
			app.phrase = opts.phrase;
		}
	}
	async toSend({asset, amount, decimals = "8", toAddress, memo}) {
		let app = this;
		try {
			let {phrase: seed} = app;
			console.log(seed);
			let {network} = app;
			let midgardCache = new MidgardCache(new Midgard(network));
			let thorchainCache = new ThorchainCache(new Thornode(network), new MidgardQuery(midgardCache));
			let thorchainQuery = new ThorchainQuery(thorchainCache);
			let wallet = new Wallet(seed, thorchainQuery);
			console.log(`\ Send on ${network} :)\n`);
			decimals = cutil.asNumber(decimals);
			amount = assetAmount(amount, decimals);
			asset = assetFromString(asset);
			let destinationAddress = toAddress;
			let toChain = asset.synth ? THORChain : asset.chain;
			let client = wallet.clients[toChain];
			console.log(`sending ${amount.amount().toFixed()} ${asset.chain} to ${destinationAddress}`);
			let tx = await client.transfer({
				recipient: destinationAddress,
				amount: assetToBase(amount),
				memo,
			});
			console.log(tx);
		} catch (e) {
			console.log(e);
		}
	}
	async toShowPools() {
		let app = this;
		try {
			let {network} = app;
			let midgard = new Midgard(network);
			console.table(await midgard.getPools());
		} catch (e) {
			console.log(e);
		}
	}
	async toEstimateSwap({assets, amount, decimals = "8", tolerance = "0.01", address}) {
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

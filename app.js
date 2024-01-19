import dateformat from "dateformat";

import cosmosclientcore from "@cosmos-client/core"; const {default: cosmosclient} = cosmosclientcore;
import {Network} from "@xchainjs/xchain-client"
import {Midgard, MidgardCache, MidgardQuery} from "@xchainjs/xchain-midgard-query"
import xchainthorchainquery from "@xchainjs/xchain-thorchain-query"; const {ThorchainCache, ThorchainQuery, Thornode, TransactionStage} = xchainthorchainquery;
import {CryptoAmount, assetAmount, assetFromString, assetToBase, register9Rheader} from "@xchainjs/xchain-util";
import {Wallet} from "@xchainjs/xchain-thorchain-amm";
import axios from "axios";

import {cutil} from "@ghasemkiani/base";
import {fetch} from "@ghasemkiani/fetch";
import {App as AppBase} from "@ghasemkiani/base-app";
import {dumper} from "@ghasemkiani/base-app";
import {SysPass} from "@ghasemkiani/pass";

const df = date => dateformat(date, "yyyy-mm-dd HH:MM:ss");
const pass = await SysPass.toGetPass();

class App extends cutil.mixin(AppBase, dumper) {
	static {
		cutil.extend(this.prototype, {
			prefsId: "gkthor",
			defaultPrefs: {
				network: "mainnet",
				passkey: null,
				useCustomeFetch: false,
			},
			_passkey: null,
			_phrase: null,
			_index: null,
			_useCustomeFetch: null,
			_network: null,
			_midgard: null,
			_thornode: null,
			_midgardCache: null,
			_midgardQuery: null,
			_thorchainCache: null,
			_thorchainQuery: null,
			_wallet: null,
			affiliateAddress: null,
			affiliateBps: 0,
		});
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
	get index() {
		if (cutil.na(this._index)) {
			this._index = 0;
		}
		return this._index;
	}
	set index(index) {
		this._index = index;
	}
	get useCustomeFetch() {
		if (cutil.na(this._useCustomeFetch)) {
			this._useCustomeFetch = this.prefs.useCustomeFetch;
		}
		return this._useCustomeFetch;
	}
	set useCustomeFetch(useCustomeFetch) {
		this._useCustomeFetch = useCustomeFetch;
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
	get midgard() {
		if (cutil.na(this._midgard)) {
			this._midgard = new Midgard(this.network);
		}
		return this._midgard;
	}
	set midgard(midgard) {
		this._midgard = midgard;
	}
	get thornode() {
		if (cutil.na(this._thornode)) {
			this._thornode = new Thornode(this.network);
		}
		return this._thornode;
	}
	set thornode(thornode) {
		this._thornode = thornode;
	}
	get midgardCache() {
		if (cutil.na(this._midgardCache)) {
			this._midgardCache = new MidgardCache(this.midgard);
		}
		return this._midgardCache;
	}
	set midgardCache(midgardCache) {
		this._midgardCache = midgardCache;
	}
	get midgardQuery() {
		if (cutil.na(this._midgardQuery)) {
			this._midgardQuery = new MidgardQuery(this.midgardCache);
		}
		return this._midgardQuery;
	}
	set midgardQuery(midgardQuery) {
		this._midgardQuery = midgardQuery;
	}
	get thorchainCache() {
		if (cutil.na(this._thorchainCache)) {
			this._thorchainCache = new ThorchainCache(this.thornode, this.midgardQuery);
		}
		return this._thorchainCache;
	}
	set thorchainCache(thorchainCache) {
		this._thorchainCache = thorchainCache;
	}
	get thorchainQuery() {
		if (cutil.na(this._thorchainQuery)) {
			this._thorchainQuery = new ThorchainQuery(this.thorchainCache);
		}
		return this._thorchainQuery;
	}
	set thorchainQuery(thorchainQuery) {
		this._thorchainQuery = thorchainQuery;
	}
	get wallet() {
		if (cutil.na(this._wallet)) {
			this._wallet = new Wallet(this.phrase, this.thorchainQuery);
		}
		return this._wallet;
	}
	set wallet(wallet) {
		this._wallet = wallet;
	}
	async toDefineInitOptions() {
		await super.toDefineInitOptions();
		let app = this;
		await app.toDefineInitOptionsDumper();
		app.commander.option("-n, --network <network>", "network (mainnet/stagenet)");
		app.commander.option("--set-network <network>", "set network persistently (mainnet/stagenet)");
		app.commander.option("-k, --key <key>", "pass key");
		app.commander.option("--set-key <key>", "set pass key persistently");
		app.commander.option("-p, --phrase <phrase>", "mnemonic phrase");
		app.commander.option("-f, --fetch", "use custom fetch");
		app.commander.option("--set-fetch", "use custom fetch persistently");
		app.commander.option("--no-fetch", "don't use custom fetch");
		app.commander.option("--no-set-fetch", "don't use custom fetch persistently");
		app.commander.command("run");
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
		app.commander.command("check")
			.description("check tx status")
			.argument("<hash>", "tx to check")
			.action(async (hash) => {
				app.sub("run", async () => {
					await app.toCheckTx({hash});
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
		app.commander.command("swap")
			.description("swap")
			.argument("<assets>", "assets (in/out)")
			.option("-i, --amount <amount>", "input amount")
			.option("-d, --decimals <decimals>", "decimals")
			.option("-t, --tolerance <tolerance>", "slippage tolerance")
			.option("-a, --address <address>", "destination address")
			.action(async (assets, {amount, decimals, tolerance, address}) => {
				app.sub("run", async () => {
					await app.toSwap({assets, amount, decimals, tolerance, address});
				})
			});
	}
	async toApplyInitOptions() {
		await super.toApplyInitOptions();
		let app = this;
		await app.toApplyInitOptionsDumper();
		
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
		if (cutil.a(opts.setFetch)) {
			app.useCustomeFetch = null;
			app.prefs.useCustomeFetch = opts.setFetch;
		}
		if (cutil.a(opts.fetch)) {
			app.useCustomeFetch = opts.fetch;
		}
		if (cutil.a(opts.noSetFetch)) {
			app.useCustomeFetch = null;
			app.prefs.useCustomeFetch = !opts.noSetFetch;
		}
		if (cutil.a(opts.noFetch)) {
			app.useCustomeFetch = !opts.noFetch;
		}
		if (app.useCustomeFetch) {
			axios.interceptors.request.use(config => ({...config, fetch}));
			cosmosclient.config.globalAxios.interceptors.request.use(config => ({...config, fetch}));
		}
	}
	async toSend({asset, amount, decimals = "8", toAddress, memo}) {
		let app = this;
		try {
			let {phrase: seed} = app;
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
	async toCheckTx({hash}) {
		let app = this;
		let {thorchainCache} = app;
		let transactionStage = new TransactionStage(thorchainCache);
		let result = await transactionStage.checkTxProgress(hash);
		function makePresentable(x) {
			if (cutil.isObject(x)) {
				for (let k in x) {
					if (x[k] instanceof Date) {
						x[k] = df(x[k]);
					} else if (x[k] instanceof CryptoAmount) {
						x[k] = x[k].formatedAssetString();
					} else {
						makePresentable(x[k]);
					}
				}
			}
		}
		makePresentable(result);
		console.log(JSON.stringify(result, null, 4));
	}
	async toEstimateSwap({assets, amount, decimals = "8", tolerance = "0.01", address}) {
		let app = this;
		try {
			let {network} = app;
			let toleranceBps = cutil.asNumber(tolerance) * 1e4;
			let [assetIn, assetOut] = cutil.asString(assets).split("/");
			let fromAsset = assetFromString(assetIn);
			let toAsset = assetFromString(assetOut);
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
	async toSwap({assets, amount, decimals = "8", tolerance = "0.01", streamingInterval = "0", streamingQuantity = "0", address}) {
		let app = this;
		try {
			let {network} = app;
			let {phrase: seed} = app;
			let {index: walletIndex} = app;
			let midgardCache = new MidgardCache(new Midgard(network));
			let thorchainCache = new ThorchainCache(new Thornode(network), new MidgardQuery(midgardCache));
			let thorchainQuery = new ThorchainQuery(thorchainCache);
			let thorchainAmm = new ThorchainAMM(thorchainQuery);
			let wallet = new Wallet(seed, thorchainQuery);
			let [assetIn, assetOut] = cutil.asString(assets).split("/");
			let fromAsset = assetFromString(assetIn);
			let toAsset = assetFromString(assetOut);
			decimals = cutil.asNumber(decimals);
			let toChain = toAsset.synth ? THORChain : toAsset.chain;
			let destinationAddress = address || wallet.clients[toChain].getAddress();
			let toleranceBps = cutil.asNumber(tolerance) * 1e4;
			let swapParams = {
				fromAsset,
				amount: new CryptoAmount(assetToBase(assetAmount(amount, decimals)), fromAsset),
				destinationAsset: toAsset,
				destinationAddress,
				toleranceBps,
				wallet,
				walletIndex,
			};
			let {affiliateAddress} = app;
			if (cutil.a(affiliateAddress)) {
				let {affiliateBps} = app;
				cutil.assign(swapParams, {affiliateAddress, affiliateBps});
			}
			
			streamingInterval = cutil.asNumber(streamingInterval);
			streamingQuantity = cutil.asNumber(streamingQuantity);
			if (streamingInterval > 0) {
				delete swapParams.toleranceBps;
				cutil.assign(swapParams, {streamingInterval, streamingQuantity});
			}
			
			let outPutCanSwap = await thorchainAmm.estimateSwap(swapParams);
			let txDetails = outPutCanSwap;
			let input = swapParams.amount;
			console.log({
				memo: txDetails.memo,
				expiry: txDetails.expiry,
				toAddress: txDetails.toAddress,
				txEstimate: {
					input: input.formatedAssetString(),
					totalFees: {
						asset: assetToString(txDetails.txEstimate.totalFees.asset),
						outboundFee: txDetails.txEstimate.totalFees.outboundFee.formatedAssetString(),
						affiliateFee: txDetails.txEstimate.totalFees.affiliateFee.formatedAssetString(),
					},
					slipBasisPoints: txDetails.txEstimate.slipBasisPoints.toFixed(),
					netOutput: txDetails.txEstimate.netOutput.formatedAssetString(),
					outboundDelaySeconds: txDetails.txEstimate.outboundDelaySeconds,
					canSwap: txDetails.txEstimate.canSwap,
					errors: txDetails.txEstimate.errors,
				},
			});
			if (outPutCanSwap.txEstimate.canSwap) {
				let output = await tcAmm.doSwap(wallet, swapParams);
				console.log(`Tx hash: ${output.hash},\n Tx url: ${output.url}\n WaitTime: ${outPutCanSwap.txEstimate.outboundDelaySeconds}`);
				console.log("Waiting for transaction to be confirmed...");
				let message = "hash";
				let delayMs = outPutCanSwap.txEstimate.outboundDelaySeconds <= 6 ? (streamingInterval > 0 ? 20000 : 12000) : outPutCanSwap.txEstimate.outboundDelaySeconds * 1000;
				let startTime = new Date().getTime();
				let endTime = startTime + delayMs;
				let remainingTime = delayMs;
				while (remainingTime > 0) {
					let elapsedMs = delayMs - remainingTime;
					let remainingSeconds = Math.ceil(remainingTime / 1000);
					let elapsedSeconds = Math.floor(elapsedMs / 1000);
					let progress = Math.floor((elapsedMs / delayMs) * 100);

					console.log(`${message} (${elapsedSeconds}s/${remainingSeconds}s ${progress}%)`);

					await delay(500);
					remainingTime = endTime - new Date().getTime();
				}
				console.log(`${message} (Done!)`);
				let transactionStage = new TransactionStage(thorchainCache);
				let checkTransaction = await transactionStage.checkTxProgress(output.hash);
				console.log(`\ Checking on ${network} :)\n`);
				console.log(checkTransaction.txType);
				console.log(checkTransaction);
			}
		} catch (e) {
			console.log(e);
		}
	}
}

export {App};

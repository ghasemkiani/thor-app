import dateformat from "dateformat";

import axios from "axios";
import cosmosclientcore from "@cosmos-client/core"; const {default: cosmosclient} = cosmosclientcore;
import {Network} from "@xchainjs/xchain-client";
import {Midgard, MidgardCache, MidgardQuery} from "@xchainjs/xchain-midgard-query"
import xchainthorchainquery from "@xchainjs/xchain-thorchain-query"; const {ThorchainCache, ThorchainQuery, Thornode, TransactionStage} = xchainthorchainquery;
import {CryptoAmount, assetToString, assetAmount, baseAmount, assetFromString, assetFromStringEx, assetToBase, baseToAsset, formatBaseAsAssetAmount, register9Rheader} from "@xchainjs/xchain-util";
import xChainUtil from "@xchainjs/xchain-util";
import {Wallet, ThorchainAMM} from "@xchainjs/xchain-thorchain-amm";
import {THORChain} from "@xchainjs/xchain-thorchain";
import {AssetRuneNative} from "@xchainjs/xchain-thorchain";
import {isAssetRuneNative} from "@xchainjs/xchain-thorchain";

import {Client as DashClient, defaultDashParams} from "@xchainjs/xchain-dash";
import {Client as KujiraClient, defaultKujiParams} from "@xchainjs/xchain-kujira";

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
				kphrase: null,
				useCustomeFetch: false,
			},
			_kphrase: null,
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
	get kphrase() {
		if (cutil.na(this._kphrase)) {
			this._kphrase = this.prefs.kphrase;
		}
		return this._kphrase;
	}
	set kphrase(kphrase) {
		this._kphrase = kphrase;
	}
	get phrase() {
		if (cutil.na(this._phrase) && cutil.a(this.kphrase)) {
			this._phrase = pass.get(this.kphrase);
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
	get thorchainAmm() {
		if (cutil.na(this._thorchainAmm)) {
			this._thorchainAmm = new ThorchainAMM(this.thorchainQuery);
		}
		return this._thorchainAmm;
	}
	set thorchainAmm(thorchainAmm) {
		this._thorchainAmm = thorchainAmm;
	}
	get wallet() {
		if (cutil.na(this._wallet)) {
			let {phrase} = this;
			let {thorchainQuery} = this;
			let wallet = new Wallet(phrase, thorchainQuery);
			let {network} = this;
			if (!("DASH" in wallet.clients)) {
				wallet.clients["DASH"] = new DashClient({...defaultDashParams, network, phrase});
			}
			if (!("KUJI" in wallet.clients)) {
				wallet.clients["KUJI"] = new KujiraClient({...defaultKujiParams, network, phrase});
			}
			this._wallet = wallet;
		}
		return this._wallet;
	}
	set wallet(wallet) {
		this._wallet = wallet;
	}
	getAddressFor({chain, synth}) {
		let app = this;
		if (synth) {
			chain = THORChain;
		}
		return app.wallet?.clients[chain].getAddress();
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
		app.commander.command("addr")
			.description("show addresses")
			.action(async () => {
				app.sub("run", async () => {
					await app.toShowAddresses();
				})
			});
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
			.option("-si, --streaming-interval <streamingInterval>", "streaming interval")
			.option("-sn, --streaming-quantity <streamingQuantity>", "streaming quantity")
			.action(async (assets, {amount, decimals, tolerance, address, streamingInterval, streamingQuantity}) => {
				app.sub("run", async () => {
					await app.toEstimateSwap({assets, amount, decimals, tolerance, address, streamingInterval, streamingQuantity});
				})
			});
		app.commander.command("swap")
			.description("swap")
			.argument("<assets>", "assets (in/out)")
			.option("-i, --amount <amount>", "input amount")
			.option("-d, --decimals <decimals>", "decimals")
			.option("-t, --tolerance <tolerance>", "slippage tolerance")
			.option("-a, --address <address>", "destination address")
			.option("-si, --streaming-interval <streamingInterval>", "streaming interval")
			.option("-sn, --streaming-quantity <streamingQuantity>", "streaming quantity")
			.action(async (assets, {amount, decimals, tolerance, address, streamingInterval, streamingQuantity}) => {
				app.sub("run", async () => {
					await app.toSwap({assets, amount, decimals, tolerance, address, streamingInterval, streamingQuantity});
				})
			});
		app.commander.command("liq")
			.description("check liquidity")
			.argument("<assets>", "assets (comma separated)")
			.option("-a, --address <address>", "address")
			.action(async (assets, {address}) => {
				app.sub("run", async () => {
					await app.toCheckLiquidity({assets, address});
				})
			});
		app.commander.command("add?")
			.description("estimate add liquidity")
			.argument("<asset-pool>", "asset pool (e.g., ETH.ETH, to be paired with Native RUNE)")
			.option("-ra, --rune-amount <runeAmount>", "rune amount")
			.option("-aa, --asset-amount <assetAmount>", "asset amount")
			.option("-d, --decimals <decimals>", "asset decimals")
			.action(async (assetPool, {runeAmount, assetAmount, decimals}) => {
				app.sub("run", async () => {
					await app.toEstimateAddLiquidity({assetPool, runeAmount, assetAmount, decimals});
				})
			});
		app.commander.command("add")
			.description("add liquidity")
			.argument("<asset-pool>", "asset pool (e.g., ETH.ETH, to be paired with Native RUNE)")
			.option("-ra, --rune-amount <runeAmount>", "rune amount")
			.option("-aa, --asset-amount <assetAmount>", "asset amount")
			.option("-d, --decimals <decimals>", "asset decimals")
			.action(async (assetPool, {runeAmount, assetAmount, decimals}) => {
				app.sub("run", async () => {
					await app.toAddLiquidity({assetPool, runeAmount, assetAmount, decimals});
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
			app.kphrase = null;
			app.prefs.kphrase = opts.setKey;
		}
		if (cutil.a(opts.key)) {
			app.kphrase = opts.key;
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
	async toShowAddresses() {
		let app = this;
		try {
			let {wallet} = app;
			let {phrase} = app;
			let addresses = Object.entries(await wallet.clients).map(([chain, client]) => ({chain, address: client.getAddress()}));
			console.log(addresses.map(({chain, address}) => [chain.padEnd(8), address.padStart(48)].join("\t")).join("\n"));
		} catch(e) {
			console.log(e);
		}
	}
	async toSend({asset, amount, decimals = "8", toAddress, memo}) {
		let app = this;
		try {
			let {wallet} = app;
			console.log(`\ Send on ${network} :)\n`);
			decimals = cutil.asNumber(decimals);
			amount = assetAmount(amount, decimals);
			asset = assetFromString(asset);
			let recipient = toAddress;
			let toChain = asset.synth ? THORChain : asset.chain;
			let client = wallet.clients[toChain];
			console.log(`sending ${amount.amount().toFixed()} ${asset.chain} to ${recipient}`);
			let tx = await client.transfer({
				recipient,
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
						try {
							x[k] = df(x[k]);
						} catch(e) {}
					} else if (x[k] instanceof CryptoAmount) {
						try {
							// maybe a bug in transactionStage.checkTxProgress
							let amount = baseAmount(x[k].baseAmount.amount());
							let decimal = x[k].baseAmount.decimal;
							x[k] = formatBaseAsAssetAmount({amount, decimal}) + " " + assetToString(x[k].asset);
						} catch(e) {}
					} else {
						makePresentable(x[k]);
					}
				}
			}
		}
		makePresentable(result);
		console.log(JSON.stringify(result, null, 4));
	}
	async toEstimateSwap({assets, amount, decimals = "8", tolerance = "0.02", address, streamingInterval = "0", streamingQuantity = "0"}) {
		let app = this;
		try {
			let {network} = app;
			let toleranceBps = cutil.asNumber(tolerance) * 1e4;
			let [assetIn, assetOut] = cutil.asString(assets).split(":");
			let fromAsset = assetFromString(assetIn);
			let toAsset = assetFromString(assetOut);
			decimals = cutil.asNumber(decimals);
			let destinationAddress = address || app.getAddressFor(toAsset);
			let midgardCache = new MidgardCache(new Midgard(network));
			let thorchainCache = new ThorchainCache(new Thornode(network), new MidgardQuery(midgardCache));
			let thorchainQuery = new ThorchainQuery(thorchainCache);
			let swapParams = {
				fromAsset,
				destinationAsset: toAsset,
				amount: new CryptoAmount(assetToBase(assetAmount(amount, decimals)), fromAsset),
				destinationAddress,
				toleranceBps,
			};
			streamingInterval = cutil.asNumber(streamingInterval);
			streamingQuantity = cutil.asNumber(streamingQuantity);
			if (streamingInterval > 0) {
				// delete swapParams.toleranceBps;
				cutil.assign(swapParams, {streamingInterval, streamingQuantity});
			}
			
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
				netOutputStreaming: estimate.netOutputStreaming?.formatedAssetString(),
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
	async toSwap({assets, amount, decimals = "8", tolerance = "0.02", streamingInterval = "0", streamingQuantity = "0", address}) {
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
			let [assetIn, assetOut] = cutil.asString(assets).split(":");
			let fromAsset = assetFromString(assetIn);
			let toAsset = assetFromString(assetOut);
			decimals = cutil.asNumber(decimals);
			let destinationAddress = address || app.getAddressFor(toAsset);
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
				// delete swapParams.toleranceBps;
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
				let output = await thorchainAmm.doSwap(wallet, swapParams);
				console.log(`Tx hash: ${output.hash}\nTx url: ${output.url}\nWaitTime: ${outPutCanSwap.txEstimate.outboundDelaySeconds}`);
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

					await cutil.toSleep(500);
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
	async toCheckLiquidity({assets, address: addr}) {
		let app = this;
		let {thorchainQuery} = app;
		let ss = assets.split(",").map(s => s.trim()).filter(s => !!s);
		for (let s of ss) {
			let asset = assetFromString(s);
			let address = addr || app.getAddressFor(asset);
			try {
				let lp = await thorchainQuery.checkLiquidityPosition(asset, address);
				console.log(lp);
				console.log({
					address,
					position: lp.position,
					poolShare: {
						assetShare: lp.poolShare.assetShare.formatedAssetString(),
						runeShare: lp.poolShare.runeShare.formatedAssetString(),
					},
					lpGrowth: lp.lpGrowth,
					impermanentLossProtection: {
						ILProtection: lp.impermanentLossProtection.ILProtection.formatedAssetString(),
						totalDays: lp.impermanentLossProtection.totalDays,
					},
				});
			} catch(e) {
				console.log(e.message);
			}
		}
	}
	async toEstimateAddLiquidity({assetPool, runeAmount = "100", assetAmount = "0", decimals = "8"}) {
		try {
			let app = this;
			let {thorchainQuery} = app;
			let runeAsset = AssetRuneNative;
			let assetAsset = assetFromStringEx(assetPool);
			decimals = cutil.asNumber(decimals);
			let rune = new CryptoAmount(assetToBase(xChainUtil.assetAmount(runeAmount)), runeAsset);
			if (!isAssetRuneNative(rune.asset)) {
				throw Error("THOR.RUNE  must be the first part in 'assets' duo");
			}
			let asset = new CryptoAmount(assetToBase(xChainUtil.assetAmount(assetAmount, decimals)), assetAsset);
			let addLpParams = {rune, asset};
			let estimate = await thorchainQuery.estimateAddLP(addLpParams);
			console.log({
				rune: rune.formatedAssetString(),
				asset: asset.formatedAssetString(),
				slipPercent: estimate.slipPercent.toFixed(4),
				lpUnits: estimate.lpUnits.amount().toFixed(0),
				runeToAssetRatio: estimate.runeToAssetRatio.toFixed(8),
				transactionFee: {
					assetFee: estimate.inbound.fees.asset.formatedAssetString(),
					runeFee: estimate.inbound.fees.rune.formatedAssetString(),
					totalFees: estimate.inbound.fees.total.formatedAssetString(),
				},
				estimatedWaitSeconds: estimate.estimatedWaitSeconds,
				errors: estimate.errors,
				canAdd: estimate.canAdd,
			});
		} catch (e) {
			// console.log(e.message);
			console.log(e);
		}
	}
	async toAddLiquidity({assetPool, runeAmount, assetAmount, decimals = "8"}) {
		try {
			let app = this;
			let {thorchainAmm} = app;
			let {wallet} = app;
			
			let runeAsset = AssetRuneNative;
			let assetAsset = assetFromStringEx(assetPool);
			decimals = cutil.asNumber(decimals);
			let rune = new CryptoAmount(assetToBase(xChainUtil.assetAmount(runeAmount)), runeAsset);
			if (!isAssetRuneNative(rune.asset)) {
				throw Error("THOR.RUNE  must be the first part in 'assets' duo");
			}
			let asset = new CryptoAmount(assetToBase(xChainUtil.assetAmount(assetAmount, decimals)), assetAsset);
			let addLpParams = {rune, asset};
			let tx = await tcAmm.addLiquidityPosition(wallet, addLpParams);
			console.log(tx);
		} catch (e) {
			// console.log(e.message);
			console.log(e);
		}
	}
}

export {App};

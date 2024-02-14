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
import {Inputter} from "@ghasemkiani/io";
import {App as AppBase} from "@ghasemkiani/base-app";
import {dumper} from "@ghasemkiani/base-app";
import {SysPass} from "@ghasemkiani/pass";

const df = date => dateformat(date, "yyyy-mm-dd HH:MM:ss");
const pass = await SysPass.toGetPass();

register9Rheader(cosmosclient.config.globalAxios)
register9Rheader(axios);

let address = pass.get("account/bsc/g@000/address").toLowerCase();
let asset = assetFromString("BSC.BNB");
let network = "mainnet";
let thornode = new Thornode(network);
let midgard = new Midgard(network);
let midgardCache = new MidgardCache(midgard);
let midgardQuery = new MidgardQuery(midgardCache);
let thorchainCache = new ThorchainCache(thornode, midgardQuery);
let thorchainQuery = new ThorchainQuery(thorchainCache);

console.log({network, asset, address});

let lp = await thorchainQuery.checkLiquidityPosition(asset, address);

console.log(lp);
console.log(lp.poolShare.assetShare.baseAmount.amount().div(10 ** lp.poolShare.assetShare.baseAmount.decimal).toNumber());
console.log(lp.poolShare.runeShare.baseAmount.amount().div(10 ** lp.poolShare.runeShare.baseAmount.decimal).toNumber());

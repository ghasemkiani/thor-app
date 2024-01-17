import cosmosclientcore from '@cosmos-client/core'
const { default: cosmosclient } = cosmosclientcore;
import { Network } from '@xchainjs/xchain-client'
import XChainMidgardQuery from '@xchainjs/xchain-midgard-query'
const { Midgard, MidgardCache, MidgardQuery } = XChainMidgardQuery;
import { isAssetRuneNative } from '@xchainjs/xchain-thorchain'
import { ThorchainAMM, Wallet } from '@xchainjs/xchain-thorchain-amm'
import XChainThorchainQuery from '@xchainjs/xchain-thorchain-query'
const { AddliquidityPosition, ThorchainCache, ThorchainQuery, Thornode } = XChainThorchainQuery;
import XChainUtil from '@xchainjs/xchain-util'
const { CryptoAmount, assetAmount, assetFromStringEx, assetToBase, register9Rheader } = XChainUtil;
import axios from 'axios'

import {SysPass} from "@ghasemkiani/pass";
const pass = await SysPass.toGetPass();

register9Rheader(cosmosclient.config.globalAxios)
register9Rheader(axios)

/**
 * Add LP
 * Returns tx
 */
const addLp = async (tcAmm/* : ThorchainAMM */, wallet/* : Wallet */, argv4, argv5, argv6, argv7, argv8) => {
  try {
    const rune = new CryptoAmount(assetToBase(assetAmount(argv4)), assetFromStringEx(argv5))
    if (!isAssetRuneNative(rune.asset)) {
      throw Error('THOR.RUNE  must be the first argument')
    }
    const asset = new CryptoAmount(
      assetToBase(assetAmount(argv6, Number(argv7))),
      assetFromStringEx(argv8),
    )

    const addLpParams/* : AddliquidityPosition */ = {
      asset,
      rune,
    }
    const addlptx = await tcAmm.addLiquidityPosition(wallet, addLpParams)
    console.log(addlptx)
  } catch (e) {
    console.error(e)
  }
}

// Call the function from main()
const main = async () => {
  // let {argv} = process;
  
  let argv = ["0", "1", "seed", "mainnet", "100", "THOR.RUNE", "0", "8", "BSC.BNB"];
  let [argv0, argv1, argv2, argv3, argv4, argv5, argv6, argv7, argv8] = argv;
  
  // let phrase = pass.get("atomicwallet/phrase");
  // argv2 = phrase;
  
  const seed = argv2
  const network = argv3 /* as Network */
  const midgardCache = new MidgardCache(new Midgard(network))
  const thorchainCache = new ThorchainCache(new Thornode(network), new MidgardQuery(midgardCache))
  const thorchainQuery = new ThorchainQuery(thorchainCache)
  const thorchainAmm = new ThorchainAMM(thorchainQuery)
  const wallet = new Wallet(seed, thorchainQuery)
  await addLp(thorchainAmm, wallet, argv4, argv5, argv6, argv7, argv8)
}

main()
  .then(() => process.exit(0))
  .catch((err) => console.error(err))

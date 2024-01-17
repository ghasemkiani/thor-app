import {cutil} from "@ghasemkiani/base";

console.log();

import xchainThorchainQuery from '@xchainjs/xchain-thorchain-query'
const {
  EstimateWithdrawLP,
  WithdrawLiquidityPosition,
  ThorchainQuery,
  Midgard,
  Thornode,
  ThorchainCache,
} = xchainThorchainQuery
import { Network } from '@xchainjs/xchain-client'
import xchainUtil from '@xchainjs/xchain-util'
const { Asset, assetFromString } = xchainUtil

function print(estimate/* : EstimateWithdrawLP */, withdrawLpParams/* : WithdrawLiquidityPosition */) {
  const expanded = {
    slipPercent: estimate.slipPercent.toFixed(4),
    runeAmount: estimate.runeAmount.formatedAssetString(),
    assetAmount: estimate.assetAmount.formatedAssetString(),
    transactionFee: {
      assetFee: estimate.inbound.fees.asset.formatedAssetString(),
      runeFee: estimate.inbound.fees.rune.formatedAssetString(),
      totalFees: estimate.inbound.fees.total.formatedAssetString(),
    },
    impermanentLossProtection: {
      ILProtection: estimate.impermanentLossProtection.ILProtection.formatedAssetString(),
      totalDays: estimate.impermanentLossProtection.totalDays,
    },
    estimatedWaitSeconds: estimate.estimatedWaitSeconds,
  }
  console.log(withdrawLpParams)
  console.log(expanded)
}
/**
 * Estimate Withdraw lp function
 * Returns estimate swap object
 */
const estimateWithdrawLp = async (thorchainQuery/* : ThorchainQuery */, asset/* : Asset */, percentage/* : number */, assetAddress/* : string */, runeAddress/* : string */) => {
  try {

    const withdrawLpParams/* : WithdrawLiquidityPosition */ = {
      asset,
      percentage,
      assetAddress,
      runeAddress,
    }
    const estimate = await thorchainQuery.estimateWithdrawLP(withdrawLpParams)
    print(estimate, withdrawLpParams)
  } catch (e) {
    console.error(e)
  }
}

// Call the function from main()
const main = async () => {

  const network = Network.Mainnet
  const thorchainQuery = new ThorchainQuery(new ThorchainCache(new Midgard(network), new Thornode(network)))

  const asset = assetFromString(`ETH.ETH`)/* ! */
  const percentage = Number(50) // 0-100
  const assetAddress = '0x005b0743d8b2ed646499dc48b64b95e71b8afa43'
  const runeAddress = ``

  await estimateWithdrawLp(thorchainQuery, asset, percentage, assetAddress, runeAddress)
}

main()
  .then(() => process.exit(0))
  .catch((err) => console.error(err))

// https://dev.thorchain.org/thorchain-dev/examples/typescript-web/query-package
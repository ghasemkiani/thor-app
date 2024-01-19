import {CryptoAmount, assetAmount, baseAmount, assetFromString, assetToBase, baseToAsset, register9Rheader} from "@xchainjs/xchain-util";

let a = baseAmount(777.9, 5);

console.log(a);
console.log(a.amount().toString());
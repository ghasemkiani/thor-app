import core from "@cosmos-client/core";
const {default: cosmosclient} = core;
import {Client} from "@xchainjs/xchain-thorchain";

import {cutil} from "@ghasemkiani/base";
import {App as AppBase} from "@ghasemkiani/base-app";
import {SysPass} from "@ghasemkiani/pass";
const pass = await SysPass.toGetPass();

class App extends AppBase {
	static {
		cutil.extend(App.prototype, {
			
		});
	}
	async toTest1() {
		let app = this;
		let phrase = pass.get("atomicwallet/phrase");
		let key = pass.get("wallet/thorchain/g-atomic/key");
		let address = pass.get("wallet/thorchain/g-atomic/address");
		let index = 0;
		let client = new Client({
			phrase,
			network: "mainnet",
			clientUrl: {
				mainnet: {
					node: "https://thornode.ninerealms.com",
					rpc: "https://rpc.ninerealms.com",
				},
			},
		});
		// console.log(key);
		// console.log(Buffer.from(client.getPrivateKey(index).key).toString("hex"));
		console.log(address);
		console.log(client.getAddress(index));
		console.log(client.cosmosClient.getAddressFromPrivKey(new cosmosclient.proto.cosmos.crypto.secp256k1.PrivKey({key: Uint8Array.from(Buffer.from(key, "hex"))})));
		let _balances = await client.getBalance(address);
		console.log(_balances);
	}
	async toRun() {
		let app = this;
		await app.toTest1();
	}
}

await new App().toStart();

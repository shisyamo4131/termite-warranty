import {aggregateRulesReceipts} from './lib/rules-test-receipts.mjs'
console.log(JSON.stringify(await aggregateRulesReceipts('tmp/rules-receipts',process.env,{compare:true})))


const test = require('brittle')
const { 
  KeyManager,
  activeWallet,
  regtestNode,
  pause,
  BitcoinCurrency
} = require('./test-helpers.js')

test.test('sendTransaction', async function(t) {


  //TODO: write tests for bad transactions.
  //TODO: compare balance to make sure is reduced
  //TODO: tests for mempool transactions 


  t.test('create transaction, mine and compare result with electrum', async function(t) {
    const regtest = await regtestNode()
    const btcPay = await activeWallet()

    const { address } = await btcPay.getNewAddress()
    const { result : nodeAddr } = await regtest.getNewAddress()

    //const fuzz = Array.from({ length: 10 }, () => Math.random() * (2 - 0.00000546) + 0.00000546).map(num => +num.toFixed(8));
    const fuzz = []
    //const amounts = [0.1, 0.001, 0.01999, 1, 0.000666, 0.008484, 2.1, 2.00000001,0.00000546].concat(fuzz)
    const amounts = [0.0001]
    const fee = [2, 10, 20, 100, 300]

    async function send(amount, index) {
      const data = {
        amount: amount,
        unit: 'main',
        address: nodeAddr,
        fee: fee[index] || +(Math.random() * 100).toFixed(),
      }
      console.log('sending amount', data)
      const res = await btcPay.sendTransaction({}, data)

      
      const mTex = await btcPay.provider._getTransaction(res.txid)
      await regtest.mine(1)

      const eTx = await btcPay.provider._getTransaction(res.txid)
      t.ok(eTx.hex === res.hex, 'tx hex is same')
      t.ok(eTx.vsize === res.vSize, 'vsize is same')
      t.ok(eTx.vin.length === res.utxo.length, 'same number of vin')
      t.ok(res.vout.length === eTx.vout.length, 'same number of vout')
      eTx.vin.forEach((vin, i) => {
        const resVin = res.utxo[i]
        t.ok(vin.txid === resVin.txid, 'vin txid is same')
        t.ok(vin.vout === resVin.index, 'vin index is same')
      })
      res.vout.forEach( (vout, i) => {
        const eVout = eTx.vout[i]
        t.ok(eVout.n === i, 'vout index is same')
        t.ok(new BitcoinCurrency(vout.value, 'base').eq(new BitcoinCurrency(eVout.value, 'main')), 'vout value is same')
      })
      const eOut = eTx.vout[0]
      const eChange = eTx.vout[1]
      t.ok(eOut.scriptPubKey.address === nodeAddr, 'output address is same')
      t.ok(eChange.scriptPubKey.address === res.changeAddress.address, 'change address is same')
      t.ok(res, 'transaction sent')
    
    }

    await btcPay.syncTransactions()

    let c = 0
    for(const amount of amounts) {
      await send(amount, c)
      c++
    }
    await btcPay.destroy()
  })
})


const BitcoinPay = require('../src/wallet-pay-btc.js')
const { WalletStoreMemory } = require('../../wallet-store/src/wallet-store.js')
const KeyManager = require('../src/wallet-key-btc.js')
const BIP39Seed = require('../../wallet-seed-bip39/src/wallet-seed-bip39.js')
const Electrum = require('../src/electrum.js')
const HdWallet = require('../src/hdwallet.js')
const { bitcoin : bitcoinTest } = require('../../wallet-test-tools/')
const BitcoinCurr = require('../../wallet/src/currency.js')

async function newElectrum(config = {}) {
  config.host = 'localhost' || config.host
  config.port = '8001' || config.port
  const e = new Electrum(config)
  await e.connect()
  return e 
}

let _regtest
async function regtestNode(opts = {}) {
  if(_regtest) return _regtest
  _regtest = new bitcoinTest.BitcoinCore({})
  await _regtest.init()
  if(!opts.mine) return _regtest
  await _regtest.mine({ blocks: 1 })
  return _regtest
} 


const _store = new WalletStoreMemory()
async function activeWallet(config = {}) {
  const mnemonic = "sell clock better horn digital prevent image toward sort first voyage detail inner regular improve"
  const btcPay = new BitcoinPay({
    asset_name: 'btc',
    provider: await newElectrum(),
    key_manager: new KeyManager({
      seed: await BIP39Seed.generate(mnemonic)
    }),
    store: config.store || _store,
    network: 'regtest'
  })

  await btcPay.initialize({})

  return btcPay
}

async function pause(ms) {
  console.log('Pausing.... ' + ms + 'ms')
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve()
    }, ms)
  })
}

module.exports = {
  BitcoinPay,
  WalletStoreMemory,
  KeyManager,
  BIP39Seed,
  Electrum,
  newElectrum,
  HdWallet,
  activeWallet,
  regtestNode,
  pause,
  BitcoinCurrency: BitcoinCurr.Bitcoin
}

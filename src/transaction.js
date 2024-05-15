const bitcoin = require('bitcoinjs-lib')
const { EventEmitter } = require('events')
const { Bitcoin } = require('../../wallet/src/currency.js')

class Transaction extends EventEmitter {
  
  constructor(config) {
    super()

    this._max_fee_limit = 100000 || config.max_fee_limit
    this.network = config.network
    this.provider = config.provider
    this.keyManager = config.keyManager
    this._getInternalAddress = config.getInternalAddress
    this._syncManager = config.syncManager
  }

  async send(opts) {
    const tx = await this._createTransaction(opts)
    return this._broadcastTransaction(tx)
  }

  async _broadcastTransaction(tx) {

    const res = await this.provider.broadcastTransaction(tx.hex)

    console.log(res)

  }

  _generateRawTx(utxoSet, fee, sendAmount, address, changeAddr, weight=1) {
    const { keyManager } = this

    const psbt = new bitcoin.Psbt({ network: bitcoin.networks[this.network] })
    const { utxo, total } = utxoSet 
    utxo.forEach((utxo, index) => {
      psbt.addInput({
        hash: utxo.txid,
        index: utxo.index,
        witnessUtxo: {
          script: Buffer.from(utxo.witness_hex, 'hex'),
          value: +utxo.value.toBaseUnit()
        },
      })

      psbt.updateInput(index, {
        bip32Derivation: [
          {
            masterFingerprint: keyManager.bip32.fingerprint,
            path : utxo.address_path,
            pubkey: Buffer.from(utxo.address_public_key, 'hex')
          },
        ]})
    })
    
    const totalFee = Bitcoin.BN(fee).times(weight)
    const change = Bitcoin.BN(total.toBaseUnit()).minus(sendAmount.toBaseUnit()).minus(totalFee).toNumber()
    
    psbt.addOutput({
      address,
      value: +sendAmount.toBaseUnit() 
    })

    psbt.addOutput({
      address: changeAddr.address, 
      value: change
    })
    utxo.forEach((u,index) => {
      psbt.signInputHD(index, keyManager.bip32)
    })
    psbt.finalizeAllInputs();
    const tx = psbt.extractTransaction()
    return {
      feeRate: psbt.getFeeRate(),
      totalFee: totalFee.toNumber(),
      vSize: tx.virtualSize(),
      hex: tx.toHex(),
      txid: tx.getId()
    }
  }

  async _createTransaction({ address, amount, unit, fee}) {


    if(!fee || fee <= 0 || fee > this._max_fee_limit) throw new Error('Invalid fee '+fee)

    const changeAddr = await this._getInternalAddress()
    const sendAmount = new Bitcoin(amount, unit)
    const utxoSet =  this._syncManager.utxoForAmount({ amount, unit})

    // Generate a fake transaction to determine weight of the transaction
    // then we create a new tx with correct fee
    const fakeTx = this._generateRawTx(utxoSet, fee, sendAmount, address, changeAddr)
    const realTx = this._generateRawTx(utxoSet, fee, sendAmount, address, changeAddr, fakeTx.vSize)
    console.log(realTx)
    return realTx

  }
}

module.exports = Transaction;

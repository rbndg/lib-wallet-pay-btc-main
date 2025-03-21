// Copyright 2024 Tether Operations Limited
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

'use strict'
const { EventEmitter } = require('events')

class StateDb {
  constructor (config) {
    this.store = config.store
  }

  async init () {
    await this.store.init()
  }

  async updateReceiveBalance (balance) {
    return this.store.put('receive_balance', balance)
  }

  async addWatchedScriptHashes (list, addrType) {
    return this.store.put('watched_script_hashes_' + addrType, list)
  }

  async getWatchedScriptHashes (addrType) {
    return await (this.store.get('watched_script_hashes_' + addrType)) || []
  }

  async setTotalBalance (balance) {
    return this.store.put('total_balance', balance)
  }

  async getTotalBalance () {
    return this.store.get('total_balance')
  }

  async getLatestBlock () {
    return await (this.store.get('latest_block')) || 0
  }

  async setLatestBlock (block) {
    return this.store.put('latest_block', block)
  }
}

/**
* @desc BlockCounter: Used to track block height within wallet.
* @param {Object} config - Config
* @param {Object} config.state - state instance for storing block height
* @emits {Object} new-block - new block
* @emits {Object} block - block
* @emits {Object} diff - diff
* @emits {Object} last - last block
* */
class BlockCounter extends EventEmitter {
  constructor (config) {
    super()
    this.state = config.state
  }

  async init () {
    this.block = await this.state.getLatestBlock()
  }

  async setBlock (newBlock) {
    const { height } = newBlock

    const diff = height - this.block
    const last = this.block
    if (diff < 0) {
      // Block reorg?
      console.log('block reorg detected')
      return
    }

    this.block = height
    await this._emitBlock({
      current: height,
      diff,
      last
    })
    this.state.setLatestBlock(this.block)
    return true
  }

  async _emitBlock (block) {
    this.emit('new-block', block)
  }
}

module.exports = {
  BlockCounter,
  StateDb
}

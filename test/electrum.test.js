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
//
const test = require('brittle')
const { WalletStoreMemory } = require('lib-wallet-store')
const { newElectrum } = require('./test-helpers.js')

test('electrum', function (t) {
  const methods = [
    {
      method: 'blockchain.transaction.get',
      params: ['735d835e3ed852bf0c7fd7260da97cbd64fc04b07c259a8285f6817ca0670187', true],
      expected: [
        '735d835e3ed852bf0c7fd7260da97cbd64fc04b07c259a8285f6817ca0670187',
        'txid'
      ]
    }
  ]

  t.test('electrum methods', async function (t) {
    const e = await newElectrum({
      store: new WalletStoreMemory({})
    })

    await Promise.all(methods.map(async function (m) {
      const res = await e.rpc(m.method, m.params)
      t.ok(res[m.expected[1]] === m.expected[0], m.method)
    }))
    await e.close()
  })
  t.end()
})

test('provider updateEndpoint', async (t) => {
  const e = await newElectrum({
    store: new WalletStoreMemory({})
  })

  t.plan(1)
  let c = -1
  const exp = {
    host: 'localhost',
    port: '9999'
  }
  e.on('status', async (_) => {
    c++
    const ep = await e.getProviderEndpoint()
    t.alike(ep, exp, 'updated endpoint  reconnection')
  })
  await e.updateEndpoint(exp).catch(() => { console.log(1) })
})

test('provider  reconnection', async (t) => {
  const e = await newElectrum({
    store: new WalletStoreMemory({})
  })

  t.plan(8)
  let c = -1
  e.on('status', async (data) => {
    c++
    if (c === 0) {
      t.ok(data.prevStatus.code === 2, 'prev status is connected')
      t.ok(data.newStatus.code === 0, 'new status is disconnected')
      return
    }
    if (c === 1) {
      t.ok(data.prevStatus.code === 0, 'prev status is disconnected ')
      t.ok(data.newStatus.code === 1, 'new status is connecting')
      return
    }
    if (c === 2) {
      t.ok(data.prevStatus.code === 1, 'prev status is connecting ')
      t.ok(data.newStatus.code === 2, 'new status is connected')
      await e.close()
      return
    }
    if (c === 3) {
      t.ok(data.prevStatus.code === 2, 'prev status is connected ')
      t.ok(data.newStatus.code === 5, 'new status is destroyed')
    }
  })

  await e.reconnect()
})

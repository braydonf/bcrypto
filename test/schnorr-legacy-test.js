'use strict';

const assert = require('bsert');
const p192 = require('../lib/p192');
const p224 = require('../lib/p224');
const p256 = require('../lib/p256');
const p384 = require('../lib/p384');
const p521 = require('../lib/p521');
const secp256k1 = require('../lib/secp256k1');
const vectors = require('./data/schnorr-legacy.json');
const custom = require('./data/schnorr-legacy-custom.json');

// To test openssl schnorr:
// const ECDSA = require('../lib/native/ecdsa');
// const secp256k1 = new ECDSA('SECP256K1');

describe('Secp256k1+Schnorr Legacy', function() {
  const valid = [];
  const invalid = [];
  const batch = [];

  for (const [key_, pub_, msg_, sig_, result, comment_] of vectors) {
    const key = Buffer.from(key_, 'hex');
    const pub = Buffer.from(pub_, 'hex');
    const msg = Buffer.from(msg_, 'hex');
    const sig = Buffer.from(sig_, 'hex');
    const text = sig_.slice(0, 32).toLowerCase() + '...';
    const comment = comment_ || `should verify ${text}`;
    const batch = result ? valid : invalid;

    batch.push([msg, sig, pub]);

    it(comment, () => {
      if (key.length > 0) {
        assert(secp256k1.privateKeyVerify(key));
        assert.bufferEqual(secp256k1.publicKeyCreate(key), pub);
        assert.bufferEqual(secp256k1.schnorrSign(msg, key), sig);
      }

      assert.strictEqual(secp256k1.schnorrVerify(msg, sig, pub), result);
    });
  }

  if (secp256k1.native !== 2) {
    it('should test RNG', () => {
      // Vectors generated with libsecp256k1.
      const seed =
        'a821cecfe4d9883cb16d6218962b068e3c39f8f35b53d6babc5b09a557f92ce8';

      const expect = [
        '0000000000000000000000000000000000000000000000000000000000000001',
        'd56ac0a8d89b330aee239ff08df26f3e5b3dc3a02ed3024df31d5390248afd65',
        '31bedb0a8b3f479b64748a8b127efc5a9802b908f9db082d58e35cf81582b47a',
        '8d1727447f9272a7aff12ebc00832c6df8ac06e44b790783c6c04d5869da9363',
        'dcab50a1aea797a56bd935f64b246ade5e24f9fcddf33be95eb80955b9011d6e',
        '014a9147f2b80d3a4b7f291dc8a9b63c061d0f1335cdc1e70f82fbe35c016783'
      ];

      const {rng} = secp256k1.schnorr;
      const batch = valid.slice(0, 6);

      rng.init(batch);

      assert.bufferEqual(rng.key, seed);

      for (let i = 0; i < expect.length; i++) {
        const k = rng.generate(i);

        assert.strictEqual(k.toString(16, 64), expect[i]);
      }
    });
  }

  it('should do batch verification', () => {
    assert.strictEqual(secp256k1.schnorrVerifyBatch([]), true);
    assert.strictEqual(secp256k1.schnorrVerifyBatch(valid), true);

    for (const item of valid)
      assert.strictEqual(secp256k1.schnorrVerifyBatch([item]), true);
  });

  it('should do fail batch verification', () => {
    for (const item of invalid) {
      assert.strictEqual(secp256k1.schnorrVerifyBatch([item, ...valid]), false);
      assert.strictEqual(secp256k1.schnorrVerifyBatch([...valid, item]), false);
      assert.strictEqual(secp256k1.schnorrVerifyBatch([item]), false);
    }
  });

  it('should handle uncompressed key properly', () => {
    // See: https://github.com/bcoin-org/bcrypto/issues/17
    const msg = Buffer.from(
      'cd3808fc5cbf9f2190d9b867b4498f234212984b8c879f296cf8e792b622a2f4',
      'hex');

    const sig = Buffer.from(''
      + '0df4be7f5fe74b2855b92082720e889038e15d8d747334fa3f300ef4ab1db1ee'
      + 'a56aa83d1d60809ff6703791736be87cfb6cbc5c4036aeed3b4ea4e6dab35090',
      'hex');

    const key = Buffer.from('04'
      + '79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798'
      + '483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8',
      'hex');

    assert.strictEqual(secp256k1.schnorrVerify(msg, sig, key), true);
    assert.strictEqual(secp256k1.schnorrVerifyBatch([[msg, sig, key]]), true);
  });

  it('should be generalized for other curves', () => {
    const msg1 = Buffer.from(
      '3b3c4a629b78ca392e689526c445119ac9f27d7986e177764a1db2d9935f2832',
      'hex');

    const key1 = Buffer.from(
      '1bc2f148de5c165eb8b85d045e8dbe06ef576b38c656155259d4589dc5d87fd0',
      'hex');

    const pub1 = p256.publicKeyCreate(key1);
    const sig1 = p256.schnorrSign(msg1, key1);

    assert.bufferEqual(sig1, 'a000291e6966f7cf5ae83d0fb146758f'
                           + '2fe688e495c3faf85cea3f2dfdd9a855'
                           + '91f7d19d9be8143638c50f3f277d50ad'
                           + 'e2a569c9d2cf40659e26341783efd4f5');

    const msg2 = Buffer.from(
      '80b5231719a45f4728ed50d7761062aaf3800b4e96b9c884c9103280872efe6a',
      'hex');

    const key2 = Buffer.from(
      'b5eadc0a15a535c185ff3e0740d8013b247f8e233789f16f1dc2dd13cd186f1f',
      'hex');

    const pub2 = p256.publicKeyCreate(key2);
    const sig2 = p256.schnorrSign(msg2, key2);

    assert.bufferEqual(sig2, 'c1da5cfe84a36ca590353ad2da330fba'
                           + 'b231558dcd614be855a5f070d7823c47'
                           + '710fb13b12c609099e4bd45afe5f6524'
                           + '2f7a2afa0e84dcf9864d2567686198e2');

    const batch = [
      [msg1, sig1, pub1],
      [msg2, sig2, pub2]
    ];

    assert.strictEqual(p256.schnorrVerify(...batch[0]), true);
    assert.strictEqual(p256.schnorrVerify(...batch[1]), true);
    assert.strictEqual(p256.schnorrVerifyBatch([batch[0]]), true);
    assert.strictEqual(p256.schnorrVerifyBatch([batch[1]]), true);
    assert.strictEqual(p256.schnorrVerifyBatch(batch), true);
    assert.strictEqual(p256.schnorrVerifyBatch([]), true);
  });

  it('should check schnorr support for various curves', () => {
    if (p192.native !== 0)
      this.skip();

    // Out of all of the NIST curves, P224 is the only
    // curve where `-1 mod p` is a quadratic residue.
    // Fun fact: P224 is also the only NIST curve whose
    // prime doesn't satisfy either `p mod 4 == 3` or
    // `p mod 8 == 5`, lending itself to much slower
    // square roots.
    assert(p192.schnorr.supported);
    assert(!p224.schnorr.supported);
    assert(p256.schnorr.supported);
    assert(p384.schnorr.supported);
    assert(p521.schnorr.supported);
    assert(secp256k1.schnorr.supported);
  });

  it('should throw on curves which fail to satisfy jacobi(-1, p) == -1', () => {
    const msg = Buffer.from(
      '3b3c4a629b78ca392e689526c445119ac9f27d7986e177764a1db2d9935f2832',
      'hex');

    const key = Buffer.from(
      '1a8e7926ac39de66fe1f86838e1915a2ae40d8e9adf4636b7d5dc698',
      'hex');

    const sig = Buffer.from(''
      + '2a28df7533ab3e0fd255d1dd657d721c6d7f6ec7c6ef8b44e32601a8'
      + 'bc440697e01348ddd45f392e420090856aed78f557e6440d1c3d4226',
      'hex');

    const pub = p224.publicKeyCreate(key);

    if (p224.native === 0) {
      assert(!p224.schnorr.supported);
      assert(!p224.schnorr.support());
    }

    assert.throws(() => p224.schnorrSign(msg, key), /not supported/);
    assert.throws(() => p224.schnorrVerify(msg, sig, pub), /not supported/);
    assert.throws(() => p224.schnorrVerifyBatch([[msg, sig, pub]]), /not supported/);
  });

  for (const [key_, pub_, msg_, sig_, result, comment_] of custom) {
    const key = Buffer.from(key_, 'hex');
    const pub = Buffer.from(pub_, 'hex');
    const msg = Buffer.from(msg_, 'hex');
    const sig = Buffer.from(sig_, 'hex');
    const hex = sig_.slice(0, 32) + '...';

    let comment = `should ${result ? 'verify' : 'fail on'} ${hex}`;

    if (!result)
      comment += ` (reason=${comment_})`;

    if (result)
      batch.push([msg, sig, pub]);

    it(comment, () => {
      if (key.length > 0) {
        assert(secp256k1.privateKeyVerify(key));
        assert.bufferEqual(secp256k1.publicKeyCreate(key), pub);
        assert.bufferEqual(secp256k1.schnorrSign(msg, key), sig);
      }

      assert.strictEqual(secp256k1.schnorrVerify(msg, sig, pub), result);
      assert.strictEqual(secp256k1.schnorrVerifyBatch([[msg, sig, pub]]), result);
    });
  }

  it('should do batch verification for custom sigs', () => {
    const [msg] = batch[0];

    assert.strictEqual(secp256k1.schnorrVerifyBatch([]), true);
    assert.strictEqual(secp256k1.schnorrVerifyBatch(batch), true);

    if (msg.length > 0) {
      msg[0] ^= 1;
      assert.strictEqual(secp256k1.schnorrVerifyBatch(batch), false);
      msg[0] ^= 1;
    }
  });
});

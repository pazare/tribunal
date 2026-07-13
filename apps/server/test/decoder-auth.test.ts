import assert from "node:assert/strict";
import test from "node:test";
import {
  assertDecoderNetworkPolicy,
  decoderOperatorAuthorized,
  isLoopbackHost,
} from "../src/decoder-auth.js";

test("decoder network policy permits loopback and requires a token elsewhere", () => {
  assert.equal(isLoopbackHost("127.0.0.1"), true);
  assert.equal(isLoopbackHost("::1"), true);
  assert.equal(isLoopbackHost("localhost"), true);
  assert.doesNotThrow(() => assertDecoderNetworkPolicy("127.0.0.1"));
  assert.throws(
    () => assertDecoderNetworkPolicy("0.0.0.0"),
    /TRIBUNAL_DECODER_OPERATOR_TOKEN/,
  );
  assert.doesNotThrow(() => assertDecoderNetworkPolicy("0.0.0.0", "operator-secret"));
});

test("decoder operator authorization accepts only the configured bearer or operator header", () => {
  const token = "operator-secret";
  assert.equal(decoderOperatorAuthorized({}, undefined), true);
  assert.equal(decoderOperatorAuthorized({}, token), false);
  assert.equal(
    decoderOperatorAuthorized({ authorization: `Bearer ${token}` }, token),
    true,
  );
  assert.equal(
    decoderOperatorAuthorized({ "x-tribunal-operator-token": token }, token),
    true,
  );
  assert.equal(
    decoderOperatorAuthorized({ authorization: "Bearer wrong" }, token),
    false,
  );
});

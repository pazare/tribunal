import assert from "node:assert/strict";
import test from "node:test";
import {
  assertDecoderNetworkPolicy,
  clearDecoderSessionCookie,
  DECODER_SESSION_COOKIE,
  DECODER_SESSION_TTL_MS,
  decoderOperatorAuthorized,
  decoderSessionTransportAllowed,
  decoderSessionCookie,
  DecoderSessionStore,
  isLoopbackHost,
} from "../src/decoder-auth.js";

test("decoder network policy permits loopback and requires a token elsewhere", () => {
  const strongToken = "a".repeat(32);
  assert.equal(isLoopbackHost("127.0.0.1"), true);
  assert.equal(isLoopbackHost("::1"), true);
  assert.equal(isLoopbackHost("localhost"), true);
  assert.doesNotThrow(() => assertDecoderNetworkPolicy("127.0.0.1"));
  assert.throws(
    () => assertDecoderNetworkPolicy("0.0.0.0"),
    /TRIBUNAL_DECODER_OPERATOR_TOKEN/,
  );
  assert.throws(
    () => assertDecoderNetworkPolicy("127.0.0.1", "operator-secret"),
    /at least 32 bytes/,
  );
  assert.doesNotThrow(() => assertDecoderNetworkPolicy("0.0.0.0", strongToken));
});

test("decoder browser unlock permits HTTPS or an actual loopback HTTP connection", () => {
  assert.equal(
    decoderSessionTransportAllowed({
      origin: "http://localhost:5173",
      host: "127.0.0.1:8787",
      remoteAddress: "::ffff:127.0.0.1",
    }),
    true,
  );
  assert.equal(
    decoderSessionTransportAllowed({
      origin: "http://localhost:5173",
      host: "192.0.2.10:8787",
      remoteAddress: "127.0.0.1",
    }),
    false,
  );
  assert.equal(
    decoderSessionTransportAllowed({
      origin: "http://localhost:5173",
      host: "127.0.0.1:8787",
      remoteAddress: "172.17.0.1",
    }),
    true,
  );
  assert.equal(
    decoderSessionTransportAllowed({
      origin: "http://192.0.2.10:5173",
      host: "127.0.0.1:8787",
      remoteAddress: "192.0.2.10",
    }),
    false,
  );
  assert.equal(
    decoderSessionTransportAllowed({
      host: "127.0.0.1:8787",
      remoteAddress: "192.0.2.10",
    }),
    false,
  );
  assert.equal(
    decoderSessionTransportAllowed({
      origin: "https://tribunal.example",
      host: "tribunal.internal:8787",
      remoteAddress: "192.0.2.10",
      forwardedProto: "https",
    }),
    false,
  );
  assert.equal(
    decoderSessionTransportAllowed({
      origin: "https://tribunal.example",
      host: "tribunal.internal:8787",
      remoteAddress: "192.0.2.10",
      trustProxy: true,
      forwardedProto: "https",
    }),
    true,
  );
  assert.equal(
    decoderSessionTransportAllowed({
      origin: "http://localhost:5173",
      host: "tribunal.internal:8787",
      remoteAddress: "192.0.2.10",
      trustProxy: true,
      forwardedProto: "https",
    }),
    false,
  );
  assert.equal(
    decoderSessionTransportAllowed({
      host: "tribunal.internal:8787",
      remoteAddress: "192.0.2.10",
      encrypted: true,
    }),
    true,
  );
});

test("decoder operator authorization accepts only the configured bearer or operator header", () => {
  const token = "0123456789abcdef".repeat(2);
  assert.equal(decoderOperatorAuthorized({}, undefined), false);
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

  let now = 1_000;
  let idIndex = 0;
  const ids = ["a".repeat(43), "b".repeat(43), "c".repeat(43)];
  const sessions = new DecoderSessionStore(token, {
    now: () => now,
    makeId: () => ids[idIndex++],
  });
  const first = sessions.unlock({ authorization: `Bearer ${token}` });
  assert.ok(first);
  assert.equal(first.expiresAt, now + DECODER_SESSION_TTL_MS);
  const firstCookie = `${DECODER_SESSION_COOKIE}=${first.id}`;
  assert.equal(sessions.authorized({ cookie: firstCookie }), true);
  assert.equal(sessions.authorized({ cookie: `${firstCookie}; ${firstCookie}` }), false);

  const setCookie = decoderSessionCookie(first, true, now);
  assert.match(setCookie, /HttpOnly/);
  assert.match(setCookie, /SameSite=Strict/);
  assert.match(setCookie, /Path=\/api/);
  assert.match(setCookie, /Secure/);
  assert.match(setCookie, /Max-Age=28800/);
  assert.equal(setCookie.includes(token), false);

  const rotated = sessions.unlock({
    authorization: `Bearer ${token}`,
    cookie: firstCookie,
  });
  assert.ok(rotated);
  assert.equal(sessions.authorized({ cookie: firstCookie }), false);
  const rotatedCookie = `${DECODER_SESSION_COOKIE}=${rotated.id}`;
  assert.equal(sessions.authorized({ cookie: rotatedCookie }), true);
  assert.equal(sessions.revoke({ cookie: rotatedCookie }), true);
  assert.equal(sessions.authorized({ cookie: rotatedCookie }), false);

  const expiring = sessions.unlock({ authorization: `Bearer ${token}` });
  assert.ok(expiring);
  const expiringCookie = `${DECODER_SESSION_COOKIE}=${expiring.id}`;
  now = expiring.expiresAt;
  assert.equal(sessions.authorized({ cookie: expiringCookie }), false);

  const cleared = clearDecoderSessionCookie(true);
  assert.match(cleared, new RegExp(`^${DECODER_SESSION_COOKIE}=`));
  assert.match(cleared, /HttpOnly/);
  assert.match(cleared, /SameSite=Strict/);
  assert.match(cleared, /Path=\/api/);
  assert.match(cleared, /Secure/);
  assert.match(cleared, /Max-Age=0/);

  const unconfigured = new DecoderSessionStore();
  assert.equal(unconfigured.authorized({}), false);
  assert.equal(unconfigured.unlock({ authorization: `Bearer ${token}` }), null);
});

import * as propelAuth from '@propelauth/node';

export const propelauth = propelAuth.initBaseAuth({
  authUrl: process.env.PROPELAUTH_AUTH_URL,
  apiKey: process.env.PROPELAUTH_API_KEY,
  manualTokenVerificationMetadata: {
    issuer: process.env.PROPELAUTH_AUTH_URL,
    verifierKey: process.env.PROPELAUTH_VERIFIER_KEY,
  },
});

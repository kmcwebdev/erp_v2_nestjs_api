import * as propelAuth from '@propelauth/node';

console.log(process.env.PROPELAUTH_AUTH_URL);

export const propelauth = propelAuth.initBaseAuth({
  authUrl: process.env.PROPELAUTH_AUTH_URL,
  apiKey: process.env.PROPELAUTH_API_KEY,
});

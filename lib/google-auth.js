import { JWT } from 'google-auth-library';

let cachedClient = null;

export async function getDriveAccessToken() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

  if (!email || !rawKey) {
    throw new Error('MISSING_GOOGLE_CREDENTIALS');
  }

  if (!cachedClient) {
    cachedClient = new JWT({
      email,
      key: rawKey.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/drive'],
    });
  }

  const { token } = await cachedClient.getAccessToken();
  if (!token) {
    throw new Error('Could not get a Google access token.');
  }
  return token;
}

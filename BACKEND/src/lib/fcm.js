import admin from 'firebase-admin';
import fs from 'fs';

let initialized = false;

export const initFCM = () => {
  if (initialized) return true;
  try {
    const keyJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    const keyPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    let serviceAccount = null;
    if (keyJson) serviceAccount = JSON.parse(keyJson);
    else if (keyPath && fs.existsSync(keyPath)) serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
    if (!serviceAccount) return false;
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    initialized = true;
    return true;
  } catch (err) {
    console.error('Failed to init FCM', err.message);
    return false;
  }
};

export const sendPushToTokens = async (tokens = [], payload = {}) => {
  if (!tokens || tokens.length === 0) return { success: 0, failure: 0 };
  if (!initFCM()) return { success: 0, failure: tokens.length, error: 'FCM not configured' };
  try {
    const message = {
      tokens,
      notification: { title: payload.title || '', body: payload.body || '' },
      data: payload.data || {},
    };
    const res = await admin.messaging().sendMulticast(message);
    return { success: res.successCount, failure: res.failureCount, responses: res.responses };
  } catch (err) {
    console.error('sendPushToTokens error', err.message || err);
    return { success: 0, failure: tokens.length, error: err.message || err };
  }
};

import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = 'support-ticketing-system-e2ee-key-2025';

export const encryptMessage = (content: string): string => {
  try {
    return CryptoJS.AES.encrypt(content, ENCRYPTION_KEY).toString();
  } catch (error) {
    console.error('Encryption error:', error);
    return content;
  }
};

export const decryptMessage = (encryptedContent: string): string => {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedContent, ENCRYPTION_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return decrypted || encryptedContent;
  } catch (error) {
    console.error('Decryption error:', error);
    return encryptedContent;
  }
};

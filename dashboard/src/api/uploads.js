// Avoid using localStorage token; rely on cookies
import fetchWithAuth from './fetchWithAuth.js';
import { createAttachment } from './attachments.js';
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';

const getAuthHeaders = () => ({ 'Content-Type': 'application/json' });

export const signUpload = async () => {
  const response = await fetchWithAuth(`${API_BASE}/uploads/sign`, { headers: getAuthHeaders() });
  if (!response.ok) throw new Error('Failed to get upload signature');
  return response.json();
};

// Upload a file directly to Cloudinary using the signed payload and create
// a Media record in the backend. Owner should be like { ticket_id } or { testing_id }.
export const uploadFileToCloudinary = async (file, owner = {}, options = {}) => {
  if (!file) throw new Error('No file provided');
  const sign = await signUpload();
  const cloudName = sign.cloud_name;
  const form = new FormData();
  form.append('file', file);
  form.append('api_key', sign.api_key);
  form.append('timestamp', sign.timestamp);
  form.append('signature', sign.signature);
  if (sign.upload_preset) form.append('upload_preset', sign.upload_preset);
  if (options.folder) form.append('folder', options.folder);
  const url = `https://api.cloudinary.com/v1_1/${cloudName}/upload`;
  const res = await fetch(url, { method: 'POST', body: form });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Cloudinary upload failed: ${res.status} ${txt}`);
  }
  const cloudData = await res.json();
  // Map Cloudinary response to our attachment payload
  const payload = {
    filename: file.name,
    uploaded_by: options.uploaded_by,
    cloudinary_public_id: cloudData.public_id,
    url: cloudData.url,
    secure_url: cloudData.secure_url,
    resource_type: cloudData.resource_type || options.type || 'raw',
    mime_type: cloudData.resource_type === 'image' ? (cloudData.format && `image/${cloudData.format}`) : file.type,
    size: cloudData.bytes || file.size,
    width: cloudData.width,
    height: cloudData.height,
    format: cloudData.format,
    alt_text: options.alt_text || null,
    ...owner,
  };
  // Create backend attachment
  return createAttachment(payload);
};

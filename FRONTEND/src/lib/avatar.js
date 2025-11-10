// Small helper to normalize avatar URLs across the app
export function avatarFor(objOrUrl, fallback = '/avatar.png') {
  if (!objOrUrl) return fallback;
  if (typeof objOrUrl === 'string') return objOrUrl || fallback;
  // object with profilePhoto or direct url
  return objOrUrl.profilePhoto || objOrUrl.avatar || fallback;
}

export default avatarFor;

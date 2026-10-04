// Every internal link, fetch and image src goes through url() so the /iros26-site/ base is never forgotten.
export function joinBase(base, path) {
  return base.replace(/\/?$/, "/") + String(path).replace(/^\//, "");
}

export const url = (path) => joinBase(import.meta.env.BASE_URL, path);

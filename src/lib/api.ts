export const api = (path: string, init?: RequestInit) =>
  fetch('https://hangeulsarangnoriteo-1059042143974.us-central1.run.app' + 'api/' + path.replace(/^\/+/, ''), init)
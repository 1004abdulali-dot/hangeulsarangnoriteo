export const api = (path: string, init?: RequestInit) =>
  fetch('https://service-name-1059042143974.region.run.app' + 'api/' + path.replace(/^\/+/, ''), init)
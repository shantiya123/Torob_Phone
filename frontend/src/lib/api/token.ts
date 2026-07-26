export interface AccessTokenProvider {
  getAccessToken(): string | null;
  setAccessToken(token: string | null): void;
}

export function createMemoryTokenProvider(initialToken: string | null = null): AccessTokenProvider {
  let token = initialToken;
  return {
    getAccessToken: () => token,
    setAccessToken: (nextToken) => {
      token = nextToken;
    },
  };
}

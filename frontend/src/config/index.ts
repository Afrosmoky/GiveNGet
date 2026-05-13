import { environment as env } from './environment';

type Environment = {
  production: boolean;
  apiUrl: string;
  environmentName: string;
  geoapifyApiKey: string;
  googleApiKey: string;
  REACT_APP_Maps_API_KEY: string;
};


export const environment: Environment =
  env

export type { Environment };

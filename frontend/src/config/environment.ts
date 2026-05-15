const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
const environmentName = process.env.NEXT_PUBLIC_ENVIRONMENT || 'local';

console.log('Environment config:', {
  apiUrl,
  environmentName,
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_ENVIRONMENT: process.env.NEXT_PUBLIC_ENVIRONMENT
});

export const environment = {
  production: false,
  apiUrl,
  environmentName,
  geoapifyApiKey: '432e181121ee40bd92c503406a809184',
  googleApiKey: 'AIzaSyAvK7yhND7NUxnpQImZhIw8r1YRS9NvWoc',
  REACT_APP_Maps_API_KEY: 'AIzaSyAvK7yhND7NUxnpQImZhIw8r1YRS9NvWoc',
}; 
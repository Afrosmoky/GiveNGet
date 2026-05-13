export const dynamic = "force-dynamic";
import { environment } from '../../../config';

export async function generateStaticParams() {
  return [
    { 'content-name': 'terms-of-service' },
    { 'content-name': 'privacy-policy' },
    { 'content-name': 'about' },
    { 'content-name': 'contact' },
    { 'content-name': 'help' },
  ];
}

async function getContent(contentName: string): Promise<string> {
  try {
    const apiUrl = environment.apiUrl;
    const fullUrl = `${apiUrl}/api/static-content/${contentName}`;
    console.log('Fetching from:', fullUrl);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 sekund timeout
    
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Accept': 'text/html,application/json,text/plain,*/*',
      },
      cache: 'no-store',
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      const text = await response.text();
      console.log('Response text length:', text.length);
      return text;
    }
    
    const errorText = await response.text().catch(() => 'Brak szczegółów błędu');
    console.error('Server error response:', errorText);
    return `Błąd ładowania treści: ${response.status} ${response.statusText} - ${fullUrl}`;
  } catch (e) {
    console.error('Fetch error:', e);
    const apiUrl = environment.apiUrl;
    const fullUrl = `${apiUrl}/api/static-content/${contentName}`;
    return `Błąd połączenia z serwerem: ${fullUrl} - ${e instanceof Error ? e.message : 'Nieznany błąd'}`;
  }
}

export default async function StaticContentPage({ params }: { params: Promise<{ 'content-name': string }> }) {
  const { 'content-name': contentName } = await params;
  const content = await getContent(contentName);

  return (
    <div style={{
      minHeight: 'calc(100vh - 160px)',
      backgroundColor: '#f7fafc',
      padding: '40px 20px'
    }}>
      <div style={{
        maxWidth: '800px',
        margin: '0 auto'
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          padding: '40px',
          marginBottom: '30px'
        }}>
          <div style={{
            textAlign: 'center',
            marginBottom: '40px'
          }}>
          </div>
          <div 
            style={{
              color: '#2d3748',
              lineHeight: '1.6',
              fontSize: '16px'
            }}
            dangerouslySetInnerHTML={{ __html: content }}
          />
        </div>
      </div>
    </div>
  );
} 
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const envName = process.env.NEXT_PUBLIC_ENVIRONMENT || 'local';

  const contentFromEnv = process.env.ADS_TXT_CONTENT;
  if (contentFromEnv && contentFromEnv.trim().length > 0) {
    return new Response(contentFromEnv, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store'
      }
    });
  }

  const candidates: string[] = [];

  if (process.env.ADS_TXT_FILE && process.env.ADS_TXT_FILE.trim().length > 0) {
    candidates.push(process.env.ADS_TXT_FILE);
  }
  console.log('envName', envName);
  console.log('next public environment', process.env.NEXT_PUBLIC_ENVIRONMENT);
  console.log('node environment', process.env.NODE_ENV);
  candidates.push(
    path.join(process.cwd(), 'public', `ads.${envName}.txt`),
    path.join(process.cwd(), 'public', 'ads.txt')
  );

  for (const filePath of candidates) {
    try {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        if (content && content.trim().length > 0) {
          return new Response(content, {
            headers: {
              'Content-Type': 'text/plain; charset=utf-8',
              'Cache-Control': 'no-store'
            }
          });
        }
      }
    } catch {
      // ignore and try next candidate
    }
  }

  return new Response('ads.txt not configured', {
    status: 404,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });
}



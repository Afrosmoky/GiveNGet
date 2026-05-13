import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="page-container">
      <div className="form-container">
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <h1 style={{ fontSize: '48px', marginBottom: '20px', color: '#2d3748' }}>
            404
          </h1>
          <h2 style={{ fontSize: '24px', marginBottom: '20px', color: '#4a5568' }}>
            Strona nie została znaleziona
          </h2>
          <p style={{ fontSize: '16px', marginBottom: '30px', color: '#718096' }}>
            Przepraszamy, ale strona której szukasz nie istnieje.
          </p>
          <Link href="/" className="btn-primary" style={{ display: 'inline-block', textDecoration: 'none' }}>
            Wróć do strony głównej
          </Link>
        </div>
      </div>
    </div>
  );
} 
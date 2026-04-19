export const dynamic = 'force-dynamic';

export default function NotFound() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <h1 style={{ fontSize: 24, fontFamily: 'serif', color: '#1A1613' }}>Page Not Found</h1>
      <a href="/" style={{ color: '#A8732F' }}>Return home</a>
    </div>
  );
}

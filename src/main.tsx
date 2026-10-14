import { render } from 'preact';

function Hello() {
  return (
    <main style={{ fontFamily: 'Georgia, serif', padding: '24px', maxWidth: '480px', margin: '0 auto' }}>
      <h1>Third Ball</h1>
      <p>Your table tennis coach is on the way. The pipeline works.</p>
    </main>
  );
}

render(<Hello />, document.getElementById('app')!);

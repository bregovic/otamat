import Link from "next/link";

export default function Home() {
  return (
    <main>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        maxWidth: '480px'
      }}>

        {/* 1. Small Animated Logo (Centered above box) */}
        <div style={{
          width: '200px',
          height: '200px',
          marginBottom: '2rem',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <video
            autoPlay
            loop
            muted
            playsInline
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
            }}
          >
            <source src="/otamat/logo.mp4" type="video/mp4" />
          </video>
        </div>

        {/* 2. Input Box (Card) */}
        <div className="glass-card" style={{ margin: '0 auto', textAlign: 'center' }}>
          <div className="input-wrapper">
            <input
              type="text"
              placeholder="Zadej PIN hry"
            />
          </div>
          <button className="btn btn-primary">
            Vstoupit do hry
          </button>
        </div>

        {/* 3. Host Actions */}
        <div className="link-wrapper">
          {/* prefetch={false} prevents 404 errors in console on static hosts */}
          <Link href="/admin/create" className="link-text" prefetch={false}>
            Chceš vytvořit vlastní kvíz? <span style={{ color: '#fff', fontWeight: 'bold' }}>Klikni zde</span>
          </Link>
        </div>
      </div>
    </main>
  );
}

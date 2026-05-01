export const PageLoader = () => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      backgroundColor: 'var(--background)',
    }}
  >
    <div
      style={{
        width: 32,
        height: 32,
        borderRadius: '50%',
        background: '#E94560',
        animation: 'pulse 1.5s ease-in-out infinite',
      }}
    />
  </div>
);

export default PageLoader;

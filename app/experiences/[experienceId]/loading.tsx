export default function ExperienceLoading() {
  return (
    <div className="flex justify-center items-center h-screen px-8" style={{ background: 'var(--gray-1)' }}>
      <div className="text-center">
        <div
          className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4"
          style={{ borderColor: 'var(--accent-9)' }}
        />
        <p style={{ color: 'var(--gray-11)' }}>Loading experience...</p>
      </div>
    </div>
  );
}

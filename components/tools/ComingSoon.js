export default function ComingSoon({ title, note }) {
  return (
    <div className="panel text-center py-10">
      <div className="stamp-big">IN PROGRESS</div>
      <h2 className="font-display text-xl mt-4 mb-2">{title}</h2>
      <p className="text-ink-soft max-w-md mx-auto">{note}</p>
    </div>
  );
}

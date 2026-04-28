export function DashboardPage() {
  return <PagePlaceholder title="Dashboard" description="Overview widgets and business summary will appear here." />;
}

function PagePlaceholder({ title, description }: { title: string; description: string }) {
  return (
    <section className="page">
      <h1>{title}</h1>
      <p>{description}</p>
    </section>
  );
}

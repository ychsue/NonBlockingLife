export function SettingsCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string | null;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="space-y-1">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        {description && <p className="text-sm text-gray-600">{description}</p>}
      </div>
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}

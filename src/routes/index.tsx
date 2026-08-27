import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: IndexPage,
});

function IndexPage() {
  return (
    <div>
      <h2>Index Page</h2>
      <p>If you see this without a console error, the bug is not reproduced.</p>
      <p>
        Check the browser console for: &quot;This Suspense boundary received an
        update before it finished hydrating&quot;
      </p>
    </div>
  );
}

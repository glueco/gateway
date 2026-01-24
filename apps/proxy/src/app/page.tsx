import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="max-w-2xl text-center">
        <h1 className="text-4xl font-bold mb-4">Personal Resource Gateway</h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
          A self-hostable gateway for safely sharing access to private resources
          with cryptographic proof-of-possession identity.
        </p>

        <div className="grid gap-4 md:grid-cols-2 max-w-xl mx-auto">
          <Link
            href="/dashboard"
            className="p-6 border rounded-lg hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
          >
            <h2 className="text-xl font-semibold mb-2">Dashboard →</h2>
            <p className="text-gray-600 dark:text-gray-400">
              Manage apps, resources, and permissions
            </p>
          </Link>

          <a
            href="https://github.com/your-org/gateway"
            target="_blank"
            rel="noopener noreferrer"
            className="p-6 border rounded-lg hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
          >
            <h2 className="text-xl font-semibold mb-2">Docs →</h2>
            <p className="text-gray-600 dark:text-gray-400">
              Learn how to integrate and deploy
            </p>
          </a>
        </div>

        <div className="mt-12 p-6 bg-gray-100 dark:bg-gray-800 rounded-lg text-left">
          <h3 className="font-semibold mb-4">Quick Start</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700 dark:text-gray-300">
            <li>Configure your environment variables (.env)</li>
            <li>Add resource secrets via the dashboard</li>
            <li>Generate a pairing string</li>
            <li>Share with apps you want to grant access</li>
          </ol>
        </div>
      </div>
    </main>
  );
}

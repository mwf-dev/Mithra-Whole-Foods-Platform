"use client"
export default function Error({ error, reset }: { error: Error, reset: () => void }) {
  return (
    <div className="p-12 text-center">
      <p className="text-red-500 mb-4">Error: {error.message}</p>
      <button onClick={() => reset()} className="px-4 py-2 bg-gray-200 rounded">Try again</button>
    </div>
  );
}

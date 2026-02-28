export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 py-10">
    <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center text-center md:text-left">
      <div className="mb-4 md:mb-0">
        <h2 className="text-white text-xl font-bold">MedAI</h2>
        <p className="text-xs uppercase tracking-widest">Next-Gen Medical Analytics</p>
      </div>
      <div className="text-sm">&copy; {new Date().getFullYear()} MedAI Research Lab. All rights reserved.</div>
    </div>
  </footer>
  );
}

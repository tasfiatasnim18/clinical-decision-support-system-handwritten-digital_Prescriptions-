import { Link, useLocation } from "react-router-dom";

export default function Navbar() {
  const location = useLocation();

  const menu = [
    { name: "Home", path: "/" },
    { name: "Admin", path: "/admin" },
    { name: "Receptionist", path: "/receptionist" },
    { name: "Lab", path: "/lab" },
    { name: "Doctor", path: "/doctor" },
    { name: "Patient", path: "/patient" },
  ];

  return (
    <nav className="fixed w-full top-0 left-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
        
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-200">
            <span className="text-white font-bold text-xl">M</span>
          </div>
          <div className="text-xl font-bold text-slate-900 tracking-tighter uppercase">
            MedAI
          </div>
        </div>

        <div className="hidden md:flex gap-8 items-center">
          {menu.map((m) => {
            const isActive =
              location.pathname === m.path ||
              (m.path !== "/" && location.pathname.startsWith(m.path));

            return (
              <Link
                key={m.path}
                to={m.path}
                className={`text-sm font-bold transition-all ${
                  isActive
                    ? "text-blue-600"
                    : "text-slate-500 hover:text-blue-600"
                }`}
              >
                {m.name}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

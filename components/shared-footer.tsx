import { Github, Linkedin, Twitter, Instagram, Globe } from "lucide-react";

export function SharedFooter() {
  const year = new Date().getFullYear();

  const socials = [
    { href: "https://www.linkedin.com/in/sanketsonkusare/", icon: Linkedin, label: "LinkedIn" },
    { href: "https://github.com/sanketsonkusare", icon: Github, label: "GitHub" },
    { href: "https://x.com/sassysanket", icon: Twitter, label: "X" },
    { href: "https://www.instagram.com/sassysanket/", icon: Instagram, label: "Instagram" },
    { href: "https://sanketsonkusare.me", icon: Globe, label: "Portfolio" },
  ];

  return (
    <footer className="px-6 py-4 border-t border-slate-700/30">
      <div className="flex flex-col items-center gap-2 text-xs text-slate-500">
        <div className="flex items-center gap-3">
          {socials.map(({ href, icon: Icon, label }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
              className="text-slate-500 hover:text-violet-400 transition-colors"
            >
              <Icon className="size-4" />
            </a>
          ))}
        </div>
        <p>
          © {year} AutoVoyce — Built by{" "}
          <a
            href="https://sanketsonkusare.me"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-400 hover:text-violet-400 transition-colors"
          >
            Sanket Sonkusare
          </a>
        </p>
      </div>
    </footer>
  );
}

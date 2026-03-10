import { Github, Send, Mail } from "lucide-react";
import logo from "../assets/dukaworks-logo-left-with-words.png";
import { useTranslation } from 'react-i18next';

export function Footer() {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full border-t bg-background py-6 mt-auto">
      <div className="container flex flex-col items-center justify-between gap-4 md:flex-row">
        <div className="flex flex-col items-center gap-2 md:items-start">
          <a href="https://github.com/dukaworks" target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <img 
              src={logo} 
              alt="DukaWorks Logo" 
              className="h-12 w-auto" 
            />
          </a>
          <p className="text-sm text-muted-foreground">
            {t('footer.copyright', { year: currentYear })}
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <a
            href="https://blog.dukaworks.io"
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors mr-2"
          >
            {t('footer.blog')}
          </a>
          <a
            href="https://github.com/dukaworks"
            target="_blank"
            rel="noreferrer"
            className="text-muted-foreground hover:text-primary transition-colors"
            title="GitHub"
          >
            <Github className="h-5 w-5" />
            <span className="sr-only">GitHub</span>
          </a>
          <a
            href="https://x.com/dukatalk"
            target="_blank"
            rel="noreferrer"
            className="text-muted-foreground hover:text-primary transition-colors"
            title="X (Twitter)"
          >
            {/* X Logo (Simple text representation or custom SVG if needed, using Mail as placeholder or generic icon if X icon not available in lucide-react basic set) */}
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
            >
              <path d="M4 4l11.733 16h4.267l-11.733 -16z" />
              <path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772" />
            </svg>
            <span className="sr-only">X (Twitter)</span>
          </a>
          <a
            href="https://t.me/zychen2022"
            target="_blank"
            rel="noreferrer"
            className="text-muted-foreground hover:text-primary transition-colors"
            title="Telegram"
          >
            <Send className="h-5 w-5" />
            <span className="sr-only">Telegram</span>
          </a>
          <a
            href="mailto:dukaworks.zy@gmail.com"
            className="text-muted-foreground hover:text-primary transition-colors"
            title="Email"
          >
            <Mail className="h-5 w-5" />
            <span className="sr-only">Email</span>
          </a>
        </div>
      </div>
    </footer>
  );
}
import { useTranslation } from 'react-i18next';
import { Twitter, Linkedin, Github, Mail, MapPin, ArrowRight } from "lucide-react";
import { useBranding } from "@/components/BrandingProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { CONTACT_INBOX_EMAIL } from "@shared/contact-inbox";


export function Footer() {
  const { t } = useTranslation();
  const { branding } = useBranding();
  const [email, setEmail] = useState("");
  const { toast } = useToast();

  const socialLinks = [
    branding.social_twitter_url ? { href: branding.social_twitter_url, label: "Twitter", icon: Twitter } : null,
    branding.social_linkedin_url ? { href: branding.social_linkedin_url, label: "LinkedIn", icon: Linkedin } : null,
    branding.social_github_url ? { href: branding.social_github_url, label: "GitHub", icon: Github } : null,
  ].filter((link): link is { href: string; label: string; icon: typeof Twitter } => link !== null);

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      toast({
        title: t('landing.footer.thankYou'),
        description: t('landing.footer.thankYouDesc'),
      });
      setEmail("");
    }
  };

  return (
    <footer className="relative text-slate-300" style={{ backgroundColor: "#0B2D68" }} data-testid="footer">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-6 sm:py-8 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 lg:gap-8">
          <div className="space-y-3 max-w-sm">
            <img
              src={branding.logo_url_dark}
              alt={branding.app_name || "Logo"}
              className="h-8 w-auto max-w-[160px] object-contain"
              data-testid="img-footer-logo"
            />
            <p className="text-sm text-slate-300/70 leading-snug">
              {branding.app_tagline || "AI-powered hiring platform for smarter, faster recruitment at scale."}
            </p>
            {socialLinks.length > 0 && (
              <div className="flex gap-2">
                {socialLinks.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-8 w-8 rounded-md bg-white/10 hover:bg-white/15 flex items-center justify-center transition-colors group"
                    data-testid={`link-footer-${link.label.toLowerCase()}`}
                    aria-label={link.label}
                  >
                    <link.icon className="h-4 w-4 text-slate-300 group-hover:text-blue-400 transition-colors" />
                  </a>
                ))}
              </div>
            )}
          </div>

          <form onSubmit={handleNewsletterSubmit} className="space-y-2 w-full lg:max-w-xs lg:pt-1">
            <p className="text-sm font-medium text-white">{t('landing.footer.newsletter')}</p>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder={t('landing.footer.emailPlaceholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-9 bg-white/10 border-white/15 text-white placeholder:text-slate-400 focus:border-blue-400"
                data-testid="input-newsletter-email"
              />
              <Button
                type="submit"
                size="sm"
                className="h-9 bg-blue-500 text-white border-0 shrink-0 px-3"
                data-testid="button-newsletter-submit"
              >
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </form>

          <div className="space-y-2 lg:pt-1 lg:shrink-0">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white">{t('landing.footer.contactTitle')}</h3>
            <ul className="space-y-2">
              <li>
                <a
                  href={`mailto:${CONTACT_INBOX_EMAIL}`}
                  className="flex items-center gap-2 text-slate-300/70 hover:text-blue-400 transition-colors text-sm"
                  data-testid="link-footer-email"
                >
                  <Mail className="h-4 w-4 shrink-0" />
                  {CONTACT_INBOX_EMAIL}
                </a>
              </li>
              <li className="flex items-center gap-2 text-slate-300/70 text-sm">
                <MapPin className="h-4 w-4 shrink-0" />
                <span>{t('landing.footer.location')}</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="py-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs sm:text-sm text-slate-400" data-testid="text-copyright">
            © {new Date().getFullYear()} {branding.app_name}. {t('landing.footer.allRightsReserved')}
          </p>
          <div className="flex items-center gap-4 sm:gap-6 text-xs sm:text-sm text-slate-400">
            <a href="/privacy" className="hover:text-blue-400 transition-colors">
              {t('landing.footer.privacy')}
            </a>
            <a href="/terms" className="hover:text-blue-400 transition-colors">
              {t('landing.footer.terms')}
            </a>
            <a href="/cookies" className="hover:text-blue-400 transition-colors">
              {t('landing.footer.cookies')}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;

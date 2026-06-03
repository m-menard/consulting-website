import { Link } from "wouter";
import { useTranslation } from 'react-i18next';
import { Twitter, Linkedin, Github, Mail, MapPin, ArrowRight } from "lucide-react";
import { useBranding } from "@/components/BrandingProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";


export function Footer() {
  const { t } = useTranslation();
  const { branding } = useBranding();
  const [email, setEmail] = useState("");
  const { toast } = useToast();

  const productLinks = [
    { href: "/#services", label: t('landing.footer.features'), isRoute: false },
    { href: "/use-cases", label: t('landing.footer.useCases'), isRoute: true },
    { href: "/#pricing", label: t('landing.footer.pricing'), isRoute: false },
    { href: "/#leadership", label: t('landing.navbar.ourTeam'), isRoute: false },
  ];

  const resourceLinks = [
    { href: "/intake", label: t('landing.hero.getStarted'), isRoute: true },
    { href: "/blog", label: t('landing.footer.blog'), isRoute: true },
    { href: "/contact", label: t('landing.footer.contact'), isRoute: true },
    { href: "/privacy", label: t('landing.footer.privacyPolicy'), isRoute: true },
    { href: "/terms", label: t('landing.footer.termsOfService'), isRoute: true },
  ];

  const socialLinks = [
    branding.social_twitter_url ? { href: branding.social_twitter_url, label: "Twitter", icon: Twitter } : null,
    branding.social_linkedin_url ? { href: branding.social_linkedin_url, label: "LinkedIn", icon: Linkedin } : null,
    branding.social_github_url ? { href: branding.social_github_url, label: "GitHub", icon: Github } : null,
  ].filter((link): link is { href: string; label: string; icon: typeof Twitter } => link !== null);

  const handleAnchorClick = (href: string) => {
    if (href.startsWith("#")) {
      const element = document.querySelector(href);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

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
        <div className="py-12 sm:py-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 sm:gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center gap-2.5">
              {branding.logo_url_dark && (
                <img
                  src={branding.logo_url_dark}
                  alt={branding.app_name || "Logo"}
                  className="h-10 w-auto max-w-[180px] object-contain"
                  data-testid="img-footer-logo"
                />
              )}
            </div>
            <p className="text-slate-300/70 leading-relaxed max-w-sm">
              {branding.app_tagline || "AI-powered hiring platform for smarter, faster recruitment at scale."}
            </p>
            
            <form onSubmit={handleNewsletterSubmit} className="space-y-3">
              <p className="text-sm font-medium text-white">{t('landing.footer.newsletter')}</p>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder={t('landing.footer.emailPlaceholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-white/10 border-white/15 text-white placeholder:text-slate-400 focus:border-blue-400"
                  data-testid="input-newsletter-email"
                />
                <Button 
                  type="submit"
                  className="bg-blue-500 text-white border-0 shrink-0"
                  data-testid="button-newsletter-submit"
                >
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </form>

            {socialLinks.length > 0 && (
              <div className="flex gap-3 pt-2">
                {socialLinks.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-10 w-10 rounded-lg bg-white/10 hover:bg-white/15 flex items-center justify-center transition-colors group"
                    data-testid={`link-footer-${link.label.toLowerCase()}`}
                    aria-label={link.label}
                  >
                    <link.icon className="h-5 w-5 text-slate-300 group-hover:text-blue-400 transition-colors" />
                  </a>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white">{t('landing.footer.product')}</h3>
            <ul className="space-y-3">
              {productLinks.map((link) => (
                <li key={link.href}>
                  {link.isRoute ? (
                    <Link
                      href={link.href}
                      className="text-slate-300/70 hover:text-blue-400 transition-colors text-sm"
                      data-testid={`link-footer-${link.label.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      {link.label}
                    </Link>
                  ) : (
                    <a
                      href={link.href}
                      onClick={(e) => {
                        e.preventDefault();
                        handleAnchorClick(link.href);
                      }}
                      className="text-slate-300/70 hover:text-blue-400 transition-colors text-sm"
                      data-testid={`link-footer-${link.label.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      {link.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white">{t('landing.footer.resources')}</h3>
            <ul className="space-y-3">
              {resourceLinks.map((link) => (
                <li key={link.href}>
                  {link.isRoute ? (
                    <Link
                      href={link.href}
                      className="text-slate-300/70 hover:text-blue-400 transition-colors text-sm"
                      data-testid={`link-footer-${link.label.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      {link.label}
                    </Link>
                  ) : (
                    <a
                      href={link.href}
                      onClick={(e) => {
                        e.preventDefault();
                        handleAnchorClick(link.href);
                      }}
                      className="text-slate-300/70 hover:text-blue-400 transition-colors text-sm"
                      data-testid={`link-footer-${link.label.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      {link.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white">{t('landing.footer.contactTitle')}</h3>
            <ul className="space-y-3">
              <li>
                <a
                  href={`mailto:support@${branding.app_name.toLowerCase().replace(/\s+/g, '')}.com`}
                  className="flex items-center gap-2 text-slate-300/70 hover:text-blue-400 transition-colors text-sm"
                  data-testid="link-footer-email"
                >
                  <Mail className="h-4 w-4" />
                  support@{branding.app_name.toLowerCase().replace(/\s+/g, '')}.com
                </a>
              </li>
              <li className="flex items-start gap-2 text-slate-300/70 text-sm">
                <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{t('landing.footer.location')}</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="py-6 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-slate-400" data-testid="text-copyright">
            © {new Date().getFullYear()} {branding.app_name}. {t('landing.footer.allRightsReserved')}
          </p>
          <div className="flex items-center gap-6 text-sm text-slate-400">
            <Link href="/privacy" className="hover:text-blue-400 transition-colors">
              {t('landing.footer.privacy')}
            </Link>
            <Link href="/terms" className="hover:text-blue-400 transition-colors">
              {t('landing.footer.terms')}
            </Link>
            <Link href="/cookies" className="hover:text-blue-400 transition-colors">
              {t('landing.footer.cookies')}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;

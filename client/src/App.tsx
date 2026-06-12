import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { BrandingProvider } from "@/components/BrandingProvider";
import { DirectionProvider } from "@/components/DirectionProvider";
import { CookieConsentBanner } from "@/components/CookieConsentBanner";
import { AnalyticsScripts } from "@/components/AnalyticsScripts";
import { DifyChatbotLoader } from "@/components/DifyChatbotLoader";
import LandingPage from "@/pages/LandingPage";
import PrivacyPolicy from "@/pages/policies/PrivacyPolicy";
import TermsOfService from "@/pages/policies/TermsOfService";
import CookiePolicy from "@/pages/policies/CookiePolicy";
import Blog from "@/pages/Blog";
import BlogPost from "@/pages/BlogPost";
import Contact from "@/pages/Contact";
import IntakePage from "@/pages/IntakePage";
import UseCasesPage from "@/pages/UseCasesPage";
import CaseStudyPage from "@/pages/CaseStudyPage";
import CadrianPage from "@/pages/CadrianPage";
import { ScrollToTop } from "@/components/ScrollToTop";

const LEGACY_REDIRECTS = [
  "/login",
  "/register",
  "/team/login",
  "/admin/team/login",
  "/features",
  "/pricing",
  "/integrations",
  "/install",
  "/admin",
  "/app",
] as const;

function MarketingRouter() {
  return (
    <>
      <ScrollToTop />
      <Switch>
        <Route path="/" component={LandingPage} />
        {LEGACY_REDIRECTS.map((path) => (
          <Route key={path} path={path}>
            {() => <Redirect to="/intake" />}
          </Route>
        ))}
        <Route path="/use-cases" component={UseCasesPage} />
        <Route path="/case-studies/cadrian" component={CadrianPage} />
        <Route path="/case-studies/cadrian/:slug">
          {(params) => <Redirect to={`/case-studies/${params.slug}`} />}
        </Route>
        <Route path="/case-studies/:slug" component={CaseStudyPage} />
        <Route path="/cadrian">{() => <Redirect to="/case-studies/cadrian" />}</Route>
        <Route path="/contact" component={Contact} />
        <Route path="/intake" component={IntakePage} />
        <Route path="/blog/:slug" component={BlogPost} />
        <Route path="/blog" component={Blog} />
        <Route path="/privacy" component={PrivacyPolicy} />
        <Route path="/terms" component={TermsOfService} />
        <Route path="/cookies" component={CookiePolicy} />
        <Route component={LandingPage} />
      </Switch>
    </>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <DirectionProvider>
          <BrandingProvider>
            <TooltipProvider>
              <AnalyticsScripts />
              <DifyChatbotLoader />
              <MarketingRouter />
              <Toaster />
              <CookieConsentBanner />
            </TooltipProvider>
          </BrandingProvider>
        </DirectionProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

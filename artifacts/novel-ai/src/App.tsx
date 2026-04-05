import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/lib/theme";
import Layout from "@/components/layout";
import Home from "@/pages/home";
import CreateNovel from "@/pages/create-novel";
import EditNovel from "@/pages/edit-novel";
import NovelDetail from "@/pages/novel-detail";
import Reader from "@/pages/reader";
import CreateChapter from "@/pages/create-chapter";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center">
      <h1 className="text-6xl font-serif font-bold text-primary mb-4">404</h1>
      <p className="text-xl text-muted-foreground font-medium mb-8">This page has been lost to the archives.</p>
      <a href="/" className="px-6 py-3 rounded-full bg-card border border-border hover:border-primary transition-colors">
        Return to Library
      </a>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/novels/new" component={CreateNovel} />
      <Route path="/novels/:id/edit" component={EditNovel} />
      <Route path="/novels/:id/read" component={Reader} />
      <Route path="/novels/:id/chapters/new" component={CreateChapter} />
      <Route path="/novels/:id" component={NovelDetail} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark">
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Layout>
            <Router />
          </Layout>
        </WouterRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;

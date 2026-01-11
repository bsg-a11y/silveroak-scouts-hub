import React from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Props = {
  children: React.ReactNode;
  title?: string;
};

type State = {
  hasError: boolean;
  error?: unknown;
};

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: unknown) {
    return { hasError: true, error };
  }

  componentDidCatch(error: unknown) {
    // Avoid console spam in production, but keep something for debugging.
    // eslint-disable-next-line no-console
    console.error("UI crashed:", error);
  }

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="min-h-screen w-full bg-background text-foreground flex items-center justify-center p-6">
        <Card className="w-full max-w-xl">
          <CardHeader>
            <CardTitle className="font-display">
              {this.props.title ?? "Something went wrong"}
            </CardTitle>
            <CardDescription>
              The page crashed while opening a dialog. Reloading usually fixes it.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button onClick={this.handleReload}>Reload</Button>
            <Button variant="outline" onClick={() => window.history.back()}>
              Go back
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }
}

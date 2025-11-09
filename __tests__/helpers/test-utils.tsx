import { ReactElement } from "react";
import { render, RenderOptions } from "@testing-library/react";
import { SessionProvider } from "next-auth/react";
import { MockSession } from "../mocks/auth.mock";

/**
 * Custom render function that wraps components with necessary providers
 */
interface CustomRenderOptions extends Omit<RenderOptions, "wrapper"> {
  session?: MockSession | null;
}

export function renderWithProviders(
  ui: ReactElement,
  options?: CustomRenderOptions
) {
  const { session = null, ...renderOptions } = options || {};

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <SessionProvider session={session}>
        {children}
      </SessionProvider>
    );
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

/**
 * Helper to wait for async operations
 */
export const waitFor = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Helper to create a mock NextRequest
 */
export function createMockRequest(url: string, init?: RequestInit) {
  return new Request(url, init);
}

/**
 * Helper to extract JSON from NextResponse
 */
export async function getResponseJson(response: Response) {
  return await response.json();
}

/**
 * Re-export everything from testing-library
 */
export * from "@testing-library/react";
export { renderWithProviders as render };

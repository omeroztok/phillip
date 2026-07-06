import { fireEvent, render, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Phillip } from "../index";

async function mountWidget(): Promise<ShadowRoot> {
  render(<Phillip previewId="prv_demo" apiBase="" />);
  return waitFor(() => {
    const host = document.querySelector<HTMLElement>("[data-phillip-host]");
    if (!host?.shadowRoot) throw new Error("widget not mounted yet");
    return host.shadowRoot;
  });
}

describe("conversation flow", () => {
  it("approves the preview and stops the flow", async () => {
    const shadow = await mountWidget();

    const bubble = await waitFor(() => {
      const b = shadow.querySelector<HTMLButtonElement>(".bubble");
      if (!b) throw new Error("no bubble");
      return b;
    });
    fireEvent.click(bubble);

    // Greeting + the yes/no approval quick replies appear.
    await waitFor(() => {
      expect(shadow.querySelector(".stage")).toBeTruthy();
      expect(shadow.textContent ?? "").toMatch(/honest take/i);
    });

    const yes = await waitFor(() => {
      const btn = [...shadow.querySelectorAll<HTMLButtonElement>(".qr")].find((b) =>
        /yes, looks good/i.test(b.textContent ?? ""),
      );
      if (!btn) throw new Error("approval quick replies not ready");
      return btn;
    });
    fireEvent.click(yes);

    // Phillip confirms and the flow stops — no composer, no quick replies left.
    await waitFor(
      () => {
        expect(shadow.textContent ?? "").toMatch(/website is ready/i);
      },
      { timeout: 4000 },
    );
    await waitFor(() => {
      expect(shadow.querySelector(".composer")).toBeFalsy();
      expect(shadow.querySelectorAll(".qr").length).toBe(0);
    });
  });

  it("applies a typed change directly, no button needed, and re-asks approval", async () => {
    const shadow = await mountWidget();

    fireEvent.click(
      await waitFor(() => {
        const b = shadow.querySelector<HTMLButtonElement>(".bubble");
        if (!b) throw new Error("no bubble");
        return b;
      }),
    );

    // Wait for the greeting so the composer is mounted, then type a change
    // straight into it — no "no, i want changes" click required first,
    // Lovable-style: any composer message while reviewing is an edit.
    await waitFor(() => {
      expect(shadow.textContent ?? "").toMatch(/honest take/i);
    });

    const input = await waitFor(() => {
      const el = shadow.querySelector<HTMLInputElement>(".composer input");
      if (!el) throw new Error("composer not ready");
      return el;
    });
    fireEvent.change(input, { target: { value: "make the hero warmer" } });

    const send = shadow.querySelector<HTMLButtonElement>('.composer button[type="submit"]');
    if (!send) throw new Error("no send button");
    fireEvent.click(send);

    // The request itself reads as a normal lead bubble in the transcript.
    await waitFor(() => expect(shadow.textContent ?? "").toMatch(/make the hero warmer/i));
    await waitFor(
      () => expect(shadow.textContent ?? "").toMatch(/are you happy with this version/i),
      {
        timeout: 6000,
      },
    );

    // Approval quick replies show again.
    await waitFor(() => {
      const btn = [...shadow.querySelectorAll<HTMLButtonElement>(".qr")].find((b) =>
        /yes, looks good/i.test(b.textContent ?? ""),
      );
      if (!btn) throw new Error("approval quick replies did not return");
    });
  });
});

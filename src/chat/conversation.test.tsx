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
  it("opens, greets, and streams a reply to a quick reply", async () => {
    const shadow = await mountWidget();

    const bubble = await waitFor(() => {
      const b = shadow.querySelector<HTMLButtonElement>(".bubble");
      if (!b) throw new Error("no bubble");
      return b;
    });
    fireEvent.click(bubble);

    // Greeting + the three reaction quick replies appear.
    await waitFor(() => {
      expect(shadow.querySelector(".stage")).toBeTruthy();
      expect(shadow.textContent ?? "").toMatch(/honest take/i);
    });

    const iterateReply = await waitFor(() => {
      const btn = [...shadow.querySelectorAll<HTMLButtonElement>(".qr")].find((b) =>
        /looks good/i.test(b.textContent ?? ""),
      );
      if (!btn) throw new Error("quick replies not ready");
      return btn;
    });
    fireEvent.click(iterateReply);

    // The lead's choice echoes, then Phillip's reply streams in.
    await waitFor(
      () => {
        expect(shadow.textContent ?? "").toMatch(/redo it/i);
      },
      { timeout: 4000 },
    );
  });

  it("runs an inline iteration: pick options -> working -> done", async () => {
    const shadow = await mountWidget();

    fireEvent.click(
      await waitFor(() => {
        const b = shadow.querySelector<HTMLButtonElement>(".bubble");
        if (!b) throw new Error("no bubble");
        return b;
      }),
    );

    const iterate = await waitFor(() => {
      const btn = [...shadow.querySelectorAll<HTMLButtonElement>(".qr")].find((b) =>
        /looks good/i.test(b.textContent ?? ""),
      );
      if (!btn) throw new Error("quick replies not ready");
      return btn;
    });
    fireEvent.click(iterate);

    // The backend's start_iteration control opens the guided options.
    const chip = await waitFor(
      () => {
        const c = [...shadow.querySelectorAll<HTMLButtonElement>(".iter-chip")].find((b) =>
          /warmer/i.test(b.textContent ?? ""),
        );
        if (!c) throw new Error("iteration panel not open");
        return c;
      },
      { timeout: 4000 },
    );
    fireEvent.click(chip);

    const submit = shadow.querySelector<HTMLButtonElement>(".iter-submit");
    if (!submit) throw new Error("no submit button");
    fireEvent.click(submit);

    await waitFor(() => expect(shadow.textContent ?? "").toMatch(/give me a sec/i));
    await waitFor(() => expect(shadow.textContent ?? "").toMatch(/refresh to see it/i), {
      timeout: 6000,
    });
  });
});

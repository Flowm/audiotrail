import { describe, expect, it } from "vitest";

import type { VirtualFile } from "../provider";
import { accountDataset } from "./account";

const vf = (path: string, content: string): VirtualFile => ({
  path,
  text: () => Promise.resolve(content),
});

describe("accountDataset", () => {
  it("matches all four singleton JSON files", () => {
    for (const path of [
      "Audible.AccountDetails.4/AccountDetails.json",
      "Audible.AccountCustomerAttributes.4/AccountCustomerAttribute.json",
      "Audible.CustomerOnboarding.4/CustomerOnboardingAttributes.json",
      "Audible.CustomerSegment/CustomerSegment.json",
    ]) {
      expect(accountDataset.match.test(path)).toBe(true);
    }
    expect(accountDataset.match.test("Audible.Credits/Audible.Credits.csv")).toBe(false);
  });

  it("merges attributes per marketplace, member-since = earliest creation date", async () => {
    const result = await accountDataset.parse([
      vf(
        "Audible.AccountDetails.4/AccountDetails.json",
        JSON.stringify({
          "audible.de": {
            "Creation Date": "2026-04-14T02:02:46.086Z",
            "Operational Region": "Europe",
          },
        }),
      ),
      vf(
        "Audible.CustomerOnboarding.4/CustomerOnboardingAttributes.json",
        JSON.stringify({
          "audible.de": {
            "Customer Segment": "Premium Paid Member",
            "Creation Date": "2021-06-07T23:55:30.000Z",
            "App Downloaded": "Yes",
            "Has Library Content": "Yes",
          },
        }),
      ),
    ]);

    expect(result.rows).toBe(1);
    const account = result.patch.account![0]!;
    expect(account.marketplace).toBe("audible.de");
    expect(account.creationDate).toBe(Date.UTC(2021, 5, 7, 23, 55, 30));
    expect(account.region).toBe("Europe");
    expect(account.customerSegment).toBe("Premium Paid Member");
    expect(account.appDownloaded).toBe(true);
  });

  it("warns on unreadable JSON instead of failing", async () => {
    const result = await accountDataset.parse([vf("Audible.CustomerSegment/CustomerSegment.json", "{broken")]);
    expect(result.rows).toBe(0);
    expect(result.warnings).toHaveLength(1);
  });
});

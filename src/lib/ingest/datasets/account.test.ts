import { describe, expect, it } from "vitest";

import type { VirtualFile } from "../provider";
import { accountDataset } from "./account";

const vf = (path: string, content: string): VirtualFile => ({
  path,
  text: () => Promise.resolve(content),
});

describe("accountDataset", () => {
  it("matches the legacy JSON singletons and the 2026 CSV files", () => {
    const matches = (path: string): boolean => accountDataset.match.some((pattern) => pattern.test(path));
    for (const path of [
      "Audible.AccountDetails.4/AccountDetails.json",
      "Audible.AccountCustomerAttributes.4/AccountCustomerAttribute.json",
      "Audible.CustomerOnboarding.4/CustomerOnboardingAttributes.json",
      "Audible.CustomerSegment/CustomerSegment.json",
      "Your Audible Account & Membership/Account Details.csv",
      "Your Audible Preferences & Settings/Customer Segment.csv",
      "Your Audible Preferences & Settings/Onboarding Preferences.csv",
    ]) {
      expect(matches(path), path).toBe(true);
    }
    expect(matches("Audible.Credits/Audible.Credits.csv")).toBe(false);
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

  it("reads the 2026 CSV layout, grouping by the Marketplace column", async () => {
    const result = await accountDataset.parse([
      vf(
        "Your Audible Account & Membership/Account Details.csv",
        "Marketplace,Operational Region,Country Code,Account Details Creation Date\naudible.de,Europe,DE,2026-04-14T02:02:46.086Z\n",
      ),
      vf(
        "Your Audible Preferences & Settings/Onboarding Preferences.csv",
        "Marketplace,Customer Segment,Creation Date,App Downloaded,Has Library Content\naudible.de,Premium Paid Member,2021-06-07T23:55:30.000Z,Yes,Yes\n",
      ),
    ]);

    expect(result.rows).toBe(1);
    const account = result.patch.account![0]!;
    expect(account.marketplace).toBe("audible.de");
    // earliest across 'Creation Date' and the aliased 'Account Details Creation Date'
    expect(account.creationDate).toBe(Date.UTC(2021, 5, 7, 23, 55, 30));
    expect(account.region).toBe("Europe");
    expect(account.countryCode).toBe("DE");
    expect(account.customerSegment).toBe("Premium Paid Member");
    expect(account.appDownloaded).toBe(true);
    expect(account.hasLibraryContent).toBe(true);
  });

  it("warns on unreadable JSON instead of failing", async () => {
    const result = await accountDataset.parse([vf("Audible.CustomerSegment/CustomerSegment.json", "{broken")]);
    expect(result.rows).toBe(0);
    expect(result.warnings).toHaveLength(1);
  });
});

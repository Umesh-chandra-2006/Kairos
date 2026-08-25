import { describe, expect, it } from "vitest";
import { checkLanguage } from "./language";

describe("checkLanguage conservative gate", () => {
  it("accepts normal English", () => {
    const check = checkLanguage("An index is a data structure that helps the database find rows quickly without scanning the entire table.");
    expect(check.suitable).toBe(true);
    expect(check.detectedLanguage).toBe("en");
    expect(check.rejectionReason).toBeNull();
  });

  it("accepts light Hinglish code-switching (normal Indian English)", () => {
    const transcript =
      "So basically the index works like matlab a map from keys to row locations, and the database uses it to avoid a full table scan during queries.";
    const check = checkLanguage(transcript);
    expect(check.suitable).toBe(true);
    expect(check.codeSwitchProbability).toBeGreaterThan(0);
  });

  it("flags Devanagari script immediately", () => {
    const check = checkLanguage("इंडेक्स एक data structure है जो database को fast search करने देता है");
    expect(check.suitable).toBe(false);
    expect(check.detectedLanguage).toBe("hi");
  });

  it("flags predominantly Hinglish transcripts only with enough evidence", () => {
    const hingish = "yeh index hai aur yeh database ko help karta hai kyunki yeh rows ko jaldi dhundta hai aur scan nahi karta";
    const check = checkLanguage(hingish);
    expect(check.suitable).toBe(false);

    // Short utterances stay suitable — conservative by design.
    const short = "yeh index hai na";
    expect(checkLanguage(short).suitable).toBe(true);
  });
});

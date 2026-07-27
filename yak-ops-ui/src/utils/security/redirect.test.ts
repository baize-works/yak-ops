import { getSafeReturnTo, isLoginPath } from "./redirect";

describe("security redirect", () => {
  it("preserves a same-origin path including search and hash", () => {
    expect(getSafeReturnTo("/jobs/42?tab=log#latest", "https://ops.test"))
      .toBe("/jobs/42?tab=log#latest");
  });

  it.each(["https://evil.test/x", "//evil.test/x", "/login?returnTo=/x"])(
    "rejects an unsafe destination: %s",
    (destination) => expect(getSafeReturnTo(destination, "https://ops.test")).toBe("/"),
  );

  expect(isLoginPath("/login-help")).toBe(false);
});


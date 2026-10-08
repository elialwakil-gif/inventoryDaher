import { describe, expect, it } from "vitest";
import { getUserPermissions, userHasPermission } from "./permissions";

describe("driver statement access", () => {
  it("makes the new self statement available to existing driver sales accounts", () => {
    expect(
      getUserPermissions({ role: "driver", permissions: ["driver-sales"] }),
    ).toEqual(["driver-sales", "driver-statements"]);
  });
  it("does not grant driver access to restricted accounts or regular users", () => {
    expect(
      userHasPermission(
        { role: "driver", permissions: [] },
        "driver-statements",
      ),
    ).toBe(false);
    expect(
      userHasPermission(
        { role: "user", permissions: ["driver-sales"] },
        "driver-statements",
      ),
    ).toBe(false);
    expect(
      userHasPermission(
        { role: "admin", permissions: [] },
        "driver-statements",
      ),
    ).toBe(true);
  });
});

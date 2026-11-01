"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const v1_1 = require("@neon/config/v1");
exports.default = (0, v1_1.defineConfig)({
    // Declare your Neon services here
    auth: false,
    functions: {
        hello: { name: "Hello World", source: "./hello.ts" },
    },
    // Branch policy: per-branch tuning
    branch: (branch) => {
        if (branch.isDefault) {
            // Default branch: no overrides, uses project defaults
            return {};
        }
        if (!branch.exists) {
            // New non-default branches: auto-expire
            // Run `neon checkout <name>` to create a new branch with these settings
            return { ttl: "7d" };
        }
        // Existing branch: no changes
        return {};
    },
});
//# sourceMappingURL=neon.js.map
"use strict";
/**
 * Tests: ITC-BT-27 — Instalaciones en cuartos de baño
 *
 * Cobertura:
 *   - BATHROOM_VOLUMES, BATHROOM_EQUIPOTENTIALITY
 *   - checkBathroomDevice: socket, switch, luminaire, heater, other × 0, 1, 2, outside
 */
Object.defineProperty(exports, "__esModule", { value: true });
const itc_bt_27_1 = require("../tables/itc-bt-27");
// ════════════════════════════════════════════════════════════════════════════
// Constantes
// ════════════════════════════════════════════════════════════════════════════
describe("ITC-BT-27 — Constantes", () => {
    it("BATHROOM_VOLUMES tiene 0, 1, 2, outside", () => {
        expect(itc_bt_27_1.BATHROOM_VOLUMES["0"]).toBeDefined();
        expect(itc_bt_27_1.BATHROOM_VOLUMES["1"]).toBeDefined();
        expect(itc_bt_27_1.BATHROOM_VOLUMES["2"]).toBeDefined();
        expect(itc_bt_27_1.BATHROOM_VOLUMES["outside"]).toBeDefined();
    });
    it("volumen 0 tiene minIPRating IPX7", () => {
        expect(itc_bt_27_1.BATHROOM_VOLUMES["0"].minIPRating).toBe("IPX7");
    });
    it("BATHROOM_EQUIPOTENTIALITY tiene elementos", () => {
        expect(itc_bt_27_1.BATHROOM_EQUIPOTENTIALITY.length).toBeGreaterThan(3);
    });
});
// ════════════════════════════════════════════════════════════════════════════
// checkBathroomDevice — socket
// ════════════════════════════════════════════════════════════════════════════
describe("ITC-BT-27 — checkBathroomDevice socket", () => {
    it("socket en vol.0: prohibido", () => {
        const r = (0, itc_bt_27_1.checkBathroomDevice)("socket", 0);
        expect(r.isAllowed).toBe(false);
        expect(r.reason).toContain("Prohibido");
    });
    it("socket en vol.1: prohibido", () => {
        const r = (0, itc_bt_27_1.checkBathroomDevice)("socket", 1);
        expect(r.isAllowed).toBe(false);
    });
    it("socket en vol.2: permitido", () => {
        const r = (0, itc_bt_27_1.checkBathroomDevice)("socket", 2);
        expect(r.isAllowed).toBe(true);
    });
    it("socket outside: permitido", () => {
        const r = (0, itc_bt_27_1.checkBathroomDevice)("socket", "outside");
        expect(r.isAllowed).toBe(true);
    });
});
// ════════════════════════════════════════════════════════════════════════════
// checkBathroomDevice — switch
// ════════════════════════════════════════════════════════════════════════════
describe("ITC-BT-27 — checkBathroomDevice switch", () => {
    it("switch en vol.0: prohibido", () => {
        expect((0, itc_bt_27_1.checkBathroomDevice)("switch", 0).isAllowed).toBe(false);
    });
    it("switch en vol.1: prohibido", () => {
        expect((0, itc_bt_27_1.checkBathroomDevice)("switch", 1).isAllowed).toBe(false);
    });
    it("switch en vol.2: permitido", () => {
        expect((0, itc_bt_27_1.checkBathroomDevice)("switch", 2).isAllowed).toBe(true);
    });
    it("switch outside: permitido", () => {
        expect((0, itc_bt_27_1.checkBathroomDevice)("switch", "outside").isAllowed).toBe(true);
    });
});
// ════════════════════════════════════════════════════════════════════════════
// checkBathroomDevice — luminaire
// ════════════════════════════════════════════════════════════════════════════
describe("ITC-BT-27 — checkBathroomDevice luminaire", () => {
    it("luminaire en vol.0: prohibido (solo IPX7)", () => {
        expect((0, itc_bt_27_1.checkBathroomDevice)("luminaire", 0).isAllowed).toBe(false);
    });
    it("luminaire en vol.1: permitido", () => {
        expect((0, itc_bt_27_1.checkBathroomDevice)("luminaire", 1).isAllowed).toBe(true);
    });
    it("luminaire en vol.2: permitido", () => {
        expect((0, itc_bt_27_1.checkBathroomDevice)("luminaire", 2).isAllowed).toBe(true);
    });
    it("luminaire outside: permitido", () => {
        expect((0, itc_bt_27_1.checkBathroomDevice)("luminaire", "outside").isAllowed).toBe(true);
    });
});
// ════════════════════════════════════════════════════════════════════════════
// checkBathroomDevice — heater
// ════════════════════════════════════════════════════════════════════════════
describe("ITC-BT-27 — checkBathroomDevice heater", () => {
    it("heater en vol.0: prohibido", () => {
        expect((0, itc_bt_27_1.checkBathroomDevice)("heater", 0).isAllowed).toBe(false);
    });
    it("heater en vol.1: permitido", () => {
        expect((0, itc_bt_27_1.checkBathroomDevice)("heater", 1).isAllowed).toBe(true);
    });
    it("heater en vol.2: permitido", () => {
        expect((0, itc_bt_27_1.checkBathroomDevice)("heater", 2).isAllowed).toBe(true);
    });
    it("heater outside: permitido", () => {
        expect((0, itc_bt_27_1.checkBathroomDevice)("heater", "outside").isAllowed).toBe(true);
    });
});
// ════════════════════════════════════════════════════════════════════════════
// checkBathroomDevice — other
// ════════════════════════════════════════════════════════════════════════════
describe("ITC-BT-27 — checkBathroomDevice other", () => {
    it("other en vol.0: prohibido", () => {
        expect((0, itc_bt_27_1.checkBathroomDevice)("other", 0).isAllowed).toBe(false);
    });
    it("other en vol.1: prohibido", () => {
        expect((0, itc_bt_27_1.checkBathroomDevice)("other", 1).isAllowed).toBe(false);
    });
    it("other en vol.2: permitido", () => {
        expect((0, itc_bt_27_1.checkBathroomDevice)("other", 2).isAllowed).toBe(true);
    });
    it("other outside: permitido", () => {
        expect((0, itc_bt_27_1.checkBathroomDevice)("other", "outside").isAllowed).toBe(true);
    });
});
// ════════════════════════════════════════════════════════════════════════════
// checkBathroomDevice — estructura de respuesta
// ════════════════════════════════════════════════════════════════════════════
describe("ITC-BT-27 — checkBathroomDevice estructura", () => {
    it("devuelve device, volume, isAllowed, reason, normRef", () => {
        const r = (0, itc_bt_27_1.checkBathroomDevice)("socket", 2);
        expect(r.device).toBe("socket");
        expect(r.volume).toBe(2);
        expect(typeof r.isAllowed).toBe("boolean");
        expect(typeof r.reason).toBe("string");
        expect(r.normRef).toContain("ITC-BT-27");
    });
    it("volumen no reconocido devuelve allowed false", () => {
        const r = (0, itc_bt_27_1.checkBathroomDevice)("socket", 99);
        expect(r.isAllowed).toBe(false);
        expect(r.reason).toContain("no reconocido");
    });
    it("deviceType no reconocido usa fallback (rules[deviceType] undefined)", () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const r = (0, itc_bt_27_1.checkBathroomDevice)("invalid", 2);
        expect(r.isAllowed).toBe(false);
        expect(r.reason).toContain("no reconocido");
    });
});
//# sourceMappingURL=itc-bt-27.test.js.map
import { describe, it, expect, beforeEach } from "vitest";
import { useSettingsStore } from "../../stores/settingsStore";

beforeEach(() => {
  useSettingsStore.getState().resetToDefaults();
});

describe("settingsStore", () => {
  describe("AI settings", () => {
    it("has correct defaults", () => {
      const { ai } = useSettingsStore.getState();
      expect(ai.temperature).toBe(0.7);
      expect(ai.numCtx).toBe(4096);
      expect(ai.streaming).toBe(true);
      expect(ai.defaultModel).toBe("");
    });

    it("updates temperature", () => {
      useSettingsStore.getState().updateAI({ temperature: 1.2 });
      expect(useSettingsStore.getState().ai.temperature).toBe(1.2);
    });

    it("updates model", () => {
      useSettingsStore.getState().updateAI({ defaultModel: "llama3.2" });
      expect(useSettingsStore.getState().ai.defaultModel).toBe("llama3.2");
    });

    it("updates streaming", () => {
      useSettingsStore.getState().updateAI({ streaming: false });
      expect(useSettingsStore.getState().ai.streaming).toBe(false);
    });
  });

  describe("Ollama settings", () => {
    it("has correct default URL", () => {
      expect(useSettingsStore.getState().ollama.apiUrl).toBe("http://localhost:11434");
    });

    it("updates API URL", () => {
      useSettingsStore.getState().updateOllama({ apiUrl: "http://192.168.1.100:11434" });
      expect(useSettingsStore.getState().ollama.apiUrl).toBe("http://192.168.1.100:11434");
    });
  });

  describe("search settings", () => {
    it("has correct defaults", () => {
      const { search } = useSettingsStore.getState();
      expect(search.engine).toBe("duckduckgo");
      expect(search.maxResults).toBe(8);
      expect(search.language).toBe("en");
    });

    it("updates engine", () => {
      useSettingsStore.getState().updateSearch({ engine: "brave" });
      expect(useSettingsStore.getState().search.engine).toBe("brave");
    });
  });

  describe("security settings", () => {
    it("has correct defaults", () => {
      const { security } = useSettingsStore.getState();
      expect(security.confirmCommands).toBe(true);
      expect(security.confirmDeletions).toBe(true);
      expect(security.readOnlyMode).toBe(false);
    });

    it("toggles read-only mode", () => {
      useSettingsStore.getState().updateSecurity({ readOnlyMode: true });
      expect(useSettingsStore.getState().security.readOnlyMode).toBe(true);
    });
  });

  describe("interface settings", () => {
    it("has dark theme as default", () => {
      expect(useSettingsStore.getState().interface.theme).toBe("dark");
    });

    it("updates theme", () => {
      useSettingsStore.getState().updateInterface({ theme: "light" });
      expect(useSettingsStore.getState().interface.theme).toBe("light");
    });

    it("updates language", () => {
      useSettingsStore.getState().updateInterface({ language: "pt" });
      expect(useSettingsStore.getState().interface.language).toBe("pt");
    });
  });

  describe("resetToDefaults", () => {
    it("resets all settings to defaults", () => {
      useSettingsStore.getState().updateAI({ defaultModel: "mistral", temperature: 1.5 });
      useSettingsStore.getState().updateSecurity({ readOnlyMode: true });
      useSettingsStore.getState().updateInterface({ theme: "light" });

      useSettingsStore.getState().resetToDefaults();

      expect(useSettingsStore.getState().ai.defaultModel).toBe("");
      expect(useSettingsStore.getState().ai.temperature).toBe(0.7);
      expect(useSettingsStore.getState().security.readOnlyMode).toBe(false);
      expect(useSettingsStore.getState().interface.theme).toBe("dark");
    });
  });
});

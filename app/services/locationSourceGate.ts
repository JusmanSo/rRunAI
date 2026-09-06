export type RunLocationAppState = "active" | "background" | "inactive";
export type RunLocationSource = "foreground" | "background";

export class LocationSourceGate {
  private appState: RunLocationAppState = "active";

  reset() {
    this.appState = "active";
  }

  setAppState(appState: RunLocationAppState) {
    this.appState = appState;
  }

  getActiveSource(): RunLocationSource | null {
    if (this.appState === "active") {
      return "foreground";
    }

    if (this.appState === "background") {
      return "background";
    }

    return null;
  }

  shouldProcess(source: RunLocationSource): boolean {
    return source === this.getActiveSource();
  }
}

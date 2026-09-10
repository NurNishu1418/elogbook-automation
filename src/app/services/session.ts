/**
 * Runtime-only credential holder for the app. Credentials live ONLY in this
 * process's memory (never written to disk, never logged, never included in
 * any API response). They are read from here only to pass as environment
 * variables to a spawned child process (login-check / run-workbook), which
 * is how the rest of this project already reads credentials (see
 * src/utils/env.ts) - nothing about that mechanism is changed.
 */
interface SessionState {
  loggedIn: boolean;
  username: string | null;
  userType: string | null;
  password: string | null;
}

let state: SessionState = { loggedIn: false, username: null, userType: null, password: null };

export function setSession(username: string, password: string, userType: string): void {
  state = { loggedIn: true, username, userType, password };
}

export function clearSession(): void {
  state = { loggedIn: false, username: null, userType: null, password: null };
}

/** Safe to send to the browser - never includes the password. */
export function getPublicSession() {
  return { loggedIn: state.loggedIn, username: state.username, userType: state.userType };
}

export function getCredentialsForSpawn(): { username: string; password: string; userType: string } {
  if (!state.loggedIn || !state.username || !state.password || !state.userType) {
    throw new Error('Not logged in.');
  }
  return { username: state.username, password: state.password, userType: state.userType };
}

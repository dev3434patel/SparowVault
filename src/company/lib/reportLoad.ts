/**
 * One in-flight report request at a time. A slower, older request must not
 * replace the current result or clear the current loading flag.
 */
export type ReportLoadState = {
  seq: number;
  loading: boolean;
  loadedFor: string | null;
  data: unknown;
  error: string | null;
};

export type ReportLoadResult =
  | { ok: true; data: unknown }
  | { ok: false; error: string };

export function initialReportLoadState(): ReportLoadState {
  return { seq: 0, loading: false, loadedFor: null, data: null, error: null };
}

export function beginReportLoadAt(state: ReportLoadState, seq: number): ReportLoadState {
  return {
    seq,
    loading: true,
    loadedFor: state.loadedFor,
    data: state.data,
    error: null,
  };
}

export function beginReportLoad(state: ReportLoadState): ReportLoadState {
  return beginReportLoadAt(state, state.seq + 1);
}

/** Validation failed before a request. Cancels any in-flight request. */
export function rejectReportLoad(state: ReportLoadState, reportKey: string, error: string): ReportLoadState {
  return {
    seq: state.seq + 1,
    loading: false,
    loadedFor: reportKey,
    data: null,
    error,
  };
}

export function settleReportLoad(
  state: ReportLoadState,
  requestSeq: number,
  reportKey: string,
  result: ReportLoadResult,
): ReportLoadState {
  if (requestSeq !== state.seq) return state;
  if (result.ok) {
    return {
      seq: state.seq,
      loading: false,
      loadedFor: reportKey,
      data: result.data,
      error: null,
    };
  }
  return {
    seq: state.seq,
    loading: false,
    loadedFor: reportKey,
    data: null,
    error: result.error,
  };
}

export function reportScreenStatus(
  state: ReportLoadState,
  reportKey: string,
  autoRun: boolean,
): "loading" | "error" | "ready" | "idle" {
  if (state.loading || (autoRun && state.loadedFor !== reportKey)) return "loading";
  if (state.loadedFor === reportKey && state.error) return "error";
  if (state.loadedFor === reportKey) return "ready";
  return "idle";
}

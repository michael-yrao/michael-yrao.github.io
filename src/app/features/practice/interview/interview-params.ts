import type { ParamMap } from '@angular/router';

export const JOIN_PARAM = 'join';

/** True when the URL makes this browser the candidate. */
export function isCandidateParams(params: ParamMap): boolean {
  return params.has(JOIN_PARAM);
}

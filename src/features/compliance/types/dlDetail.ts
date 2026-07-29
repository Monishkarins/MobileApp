/**
 * SARATHI full licence payload — shape returned in list row fullResponse.result
 * and shown in the web eye-icon detail modal.
 */

export interface DLDetailPayload {
  licenseDetails?: {
    dlStatus?: string;
    dlLicno?: string;
    dlIssuedt?: string;
    omRtoFullname?: string;
    olaName?: string;
    dlEndorsedt?: string;
    dlEndorseAuth?: string;
    dlNtValdfrDt?: string;
    dlNtValdtoDt?: string;
    dlTrValdfrDt?: string;
    dlTrValdtoDt?: string;
    dlHzValdfrDt?: string;
    dlHzValdtoDt?: string;
    dlHlValdfrDt?: string;
    dlHlValdtoDt?: string;
  };
  personalDetails?: {
    bioFullName?: string;
    bioFirstName?: string;
    bioMiddleName?: string;
    bioLastName?: string;
  };
  bioImageDetails?: {
    biPhoto?: string;
  };
  serviceHistory?: Array<{ trName?: string }>;
  authorizedVehicles?: Array<{
    vecatg?: string;
    covdesc?: string;
    /** Sarathi field used by web PDF / COV table */
    dcIssuedt?: string;
    covIssuedt?: string;
  }>;
}

/**
 * Public enquiry API — Request Demo / product enquiry.
 *
 * Shared with the web `/signup` flow. No auth header (see PUBLIC_AUTH_PATHS).
 * Do not confuse with dashboardApi.submitServiceEnquiry, which is the
 * authenticated in-app "Request a Service" path for existing customers.
 */
import { apiClient } from './client';
import type {
  EnquirySubmitPayload,
  EnquirySubmitResponse,
  FeaturedProductsResponse,
} from '../../types/enquiry';

export const enquiryApi = {
  /**
   * OTP send → OTP verify → final enquiry submit, all against the same route.
   * Branch is inferred server-side from which fields are present.
   */
  submit: (payload: EnquirySubmitPayload) =>
    apiClient.post<EnquirySubmitResponse>('/enquiry/submit', payload),

  /** Active featured modules shown as selectable chips on the demo form. */
  getFeaturedProducts: () =>
    apiClient.get<FeaturedProductsResponse>('/product', {
      params: { featured: true },
    }),
};
